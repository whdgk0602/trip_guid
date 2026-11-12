import { templateCourseText, type Spot } from "./buildCourse";
import type { GeoPlace } from "./kakao";
import {
  chatCompletion,
  parseJsonFromLlm,
  UpstreamError,
  type ChatMessage,
  type ChatOptions,
} from "./llm";

const MAX_TITLE = 40;
const MAX_INTRO = 200;
const MAX_SPOT_DESCRIPTION = 120;

export type GeneratedCourseText = {
  title: string;
  intro: string;
  /** spot id → 설명. 빠진 스팟은 템플릿 설명 유지 */
  descriptions: Record<string, string>;
};

export type Course = { title: string; intro: string; spots: Spot[] };

const SYSTEM_PROMPT = `너는 동네 산책 코스를 소개하는 에디터다. 주어진 경로와 장소 정보로 코스 제목, 소개, 장소별 설명을 쓴다.

톤:
- 일상 속 작은 여행처럼 따뜻하고 담백한 한국어. 과장된 감탄사나 이모지는 쓰지 않는다.
- 제목은 20자 이내, 소개는 1~2문장(80자 이내), 장소 설명은 1문장(50자 이내).

사실성 (가장 중요):
- 주어진 정보는 장소 이름, 카테고리, 주소뿐이다.
- 영업시간, 가격, 메뉴, 평점, 수상 경력, 역사, 인기도처럼 주어지지 않은 사실을 지어내지 않는다.
- 카테고리와 위치에서 자연스럽게 떠올릴 수 있는 분위기와 들르는 순간의 느낌만 묘사한다.

출력:
- 설명 없이 JSON만 출력한다.
- 형식: {"title": "...", "intro": "...", "spots": [{"id": "<주어진 id 그대로>", "description": "..."}]}`;

export function buildCourseTextMessages(places: GeoPlace[], spots: Spot[]): ChatMessage[] {
  const route = places.map((p) => p.query).join(" → ");
  const spotLines = spots
    .map((s) =>
      JSON.stringify({ id: s.id, name: s.name, category: s.category, hint: s.description, address: s.address }),
    )
    .join("\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `경로: ${route}\n\n장소:\n${spotLines}` },
  ];
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text && text.length <= max ? text : null;
}

/** LLM 응답 검증. 제목·소개가 쓸 만하지 않으면 null (→ 전부 템플릿) */
export function parseCourseText(raw: string, spots: Spot[]): GeneratedCourseText | null {
  const data = parseJsonFromLlm(raw) as
    | { title?: unknown; intro?: unknown; spots?: unknown }
    | null;
  if (!data || typeof data !== "object") return null;

  const title = cleanText(data.title, MAX_TITLE);
  const intro = cleanText(data.intro, MAX_INTRO);
  if (!title || !intro) return null;

  const knownIds = new Set(spots.map((s) => s.id));
  const descriptions: Record<string, string> = {};
  if (Array.isArray(data.spots)) {
    for (const item of data.spots as Array<{ id?: unknown; description?: unknown }>) {
      const id = typeof item?.id === "string" ? item.id : null;
      const description = cleanText(item?.description, MAX_SPOT_DESCRIPTION);
      if (id && knownIds.has(id) && description) descriptions[id] = description;
    }
  }
  return { title, intro, descriptions };
}

/** 생성 결과를 코스에 입히고, 빠진 부분은 템플릿으로 채운다 */
export function composeCourse(
  places: GeoPlace[],
  spots: Spot[],
  generated: GeneratedCourseText | null,
): Course {
  if (!generated) return { ...templateCourseText(places), spots };
  return {
    title: generated.title,
    intro: generated.intro,
    spots: spots.map((spot) => ({
      ...spot,
      description: generated.descriptions[spot.id] ?? spot.description,
    })),
  };
}

/** LLM으로 코스 텍스트 생성 (FR-4). 응답이 형식에 안 맞으면 UpstreamError — 캐시되지 않게 */
export async function generateCourseText(
  places: GeoPlace[],
  spots: Spot[],
  options: ChatOptions,
): Promise<GeneratedCourseText> {
  const content = await chatCompletion(buildCourseTextMessages(places, spots), options);
  const parsed = parseCourseText(content, spots);
  if (!parsed) throw new UpstreamError("course text response was not usable");
  return parsed;
}

/** LLM이 안 되면(한도·장애·형식 오류) 템플릿 문구로 코스를 완성한다 — 생성 자체는 실패시키지 않음 */
export async function writeCourseWithFallback(
  places: GeoPlace[],
  spots: Spot[],
  generate: (places: GeoPlace[], spots: Spot[]) => Promise<GeneratedCourseText>,
): Promise<Course> {
  try {
    return composeCourse(places, spots, await generate(places, spots));
  } catch (error) {
    if (!(error instanceof UpstreamError)) throw error;
    console.warn("[course-text] LLM unavailable, using template:", error.message);
    return composeCourse(places, spots, null);
  }
}
