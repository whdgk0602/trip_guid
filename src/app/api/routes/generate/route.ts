import { unstable_cache } from "next/cache";
import { buildSpots, type Spot } from "@/lib/server/buildCourse";
import {
  composeCourse,
  generateCourseText,
  writeCourseWithFallback,
  type Course,
} from "@/lib/server/courseText";
import { extractPlaceNames, extractWithFallback } from "@/lib/server/extractPlaceNames";
import { geocodePlace, searchNearbyCandidates, type GeoPlace } from "@/lib/server/kakao";
import { parseModelList, UpstreamError } from "@/lib/server/llm";
import { resolveRoutePlaces } from "@/lib/server/resolveRoutePlaces";
import { ruleBasedPlaceNames } from "@/lib/server/ruleBasedPlaceNames";
import { createGenerateHandler } from "./handler";

const EXTRACT_CACHE_SECONDS = 60 * 60 * 24 * 30;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new UpstreamError(`missing env ${name}`);
  return value;
}

/**
 * 같은 경로 문장의 LLM 지명 추출 결과를 30일간 재사용 (NFR-5).
 * OpenRouter 무료 한도(계정당 일일 요청 수)를 아끼기 위함 — 결과는 Next.js 캐시에 저장돼
 * 요청·배포를 넘어 유지되고, 실패(throw)는 캐시되지 않는다.
 * 키 문자열("v1")은 프롬프트를 바꿀 때 올려서 이전 결과를 무효화.
 */
const cachedLlmExtract = unstable_cache(
  async (normalizedText: string) =>
    extractPlaceNames(normalizedText, {
      apiKey: requireEnv("OPENROUTER_API_KEY"),
      models: parseModelList(requireEnv("OPENROUTER_MODEL")),
    }),
  ["extract-place-names-v1"],
  { revalidate: EXTRACT_CACHE_SECONDS },
);

/**
 * 같은 경로·같은 스팟 조합의 코스 텍스트 재사용 (NFR-5). 인자(places, spots)가 캐시 키에 포함되고,
 * 형식이 안 맞는 응답은 generateCourseText가 throw하므로 캐시되지 않는다.
 * 프롬프트를 바꾸면 키("v1")를 올릴 것.
 */
const cachedCourseText = unstable_cache(
  async (places: GeoPlace[], spots: Spot[]) =>
    generateCourseText(places, spots, {
      apiKey: requireEnv("OPENROUTER_API_KEY"),
      models: parseModelList(requireEnv("OPENROUTER_MODEL")),
      maxTokens: 800,
      // 출력이 지명 추출보다 길어서 모델당 제한 시간을 넉넉히
      timeoutMs: 12_000,
    }),
  ["course-text-v1"],
  { revalidate: EXTRACT_CACHE_SECONDS },
);

function writeCourse(places: GeoPlace[], spots: Spot[]): Promise<Course> {
  if (!process.env.OPENROUTER_API_KEY) {
    return Promise.resolve(composeCourse(places, spots, null));
  }
  return writeCourseWithFallback(places, spots, cachedCourseText);
}

function extract(text: string): Promise<string[]> {
  const normalized = text.replace(/\s+/g, " ").trim();
  // 키가 없으면(로컬에서 의도적으로 비운 경우 등) LLM을 건너뛰고 규칙 기반만 사용
  if (!process.env.OPENROUTER_API_KEY) {
    return Promise.resolve(ruleBasedPlaceNames(normalized));
  }
  return extractWithFallback(normalized, cachedLlmExtract, ruleBasedPlaceNames);
}

export const POST = createGenerateHandler({
  resolvePlaces: (text) => {
    const kakao = { apiKey: requireEnv("KAKAO_REST_API_KEY") };
    return resolveRoutePlaces(text, {
      extractPlaceNames: extract,
      geocode: (name, near) => geocodePlace(name, kakao, near),
    });
  },
  buildSpots: (places, count) => {
    const kakao = { apiKey: requireEnv("KAKAO_REST_API_KEY") };
    return buildSpots(places, count, {
      search: (anchors, radius) => searchNearbyCandidates(anchors, radius, kakao),
    });
  },
  writeCourse,
});
