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

/**
 * 짧게 유지할 것: ernie(1순위, 추론 필수)는 규칙이 많을수록 추론이 길어진다.
 * 2026-11-13 측정 — 규칙·예시가 많은 버전: 추론 ~2,000토큰·9.6초 / 이 버전: 430~715토큰·4~4.6초 (품질 동등).
 */
const SYSTEM_PROMPT = `동네 산책 코스의 제목, 소개, 장소 설명을 쓴다.

- 따뜻하고 담백한 "~해요"체. 장소가 하는 일을 설명하지 말고 들르는 순간의 느낌을 그린다.
- 제목 20자 이내(경로 나열 금지), 소개 1~2문장, 장소 설명 1문장(40자 이내). 설명마다 표현을 다르게.
- 주어진 것은 이름·카테고리·주소뿐. 메뉴·가격·영업시간·평점·역사를 지어내지 말고, 가게 이름으로 메뉴를 짐작하지 않는다.
- 예: 식당 → "골목을 한참 걸었다면, 여기서 따뜻한 한 끼로 숨을 골라요."

JSON만 출력: {"title": "...", "intro": "...", "spots": [{"id": "<주어진 id>", "description": "..."}]}`;

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
