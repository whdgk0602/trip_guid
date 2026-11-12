import {
  chatCompletion,
  parseJsonFromLlm,
  UpstreamError,
  type ChatOptions,
} from "./llm";
import { normalizePlaceNames } from "./resolveRoutePlaces";

const SYSTEM_PROMPT = `너는 한국어 경로 설명에서 지명을 뽑는 도구다.
- 지하철역, 동네(동/구), 랜드마크, 공원, 거리, 건물, 가게 이름처럼 지도에서 검색 가능한 장소만 뽑는다.
- "집", "회사", "학교"처럼 특정할 수 없는 일반 명사는 제외한다.
- 2호선 같은 노선명은 장소가 아니므로 제외한다.
- 여러 곳에 있는 일반적인 이름은 문맥의 동네를 붙여 구체화한다. 예: 망원동에서 걷는 한강공원 → "망원한강공원"
- 원문 표기를 그대로 쓴다. 오타로 보여도 임의로 다른 지명으로 바꾸지 않는다.
- 이동 순서대로 최대 5개.
- 설명 없이 JSON 문자열 배열만 출력한다. 예: ["대림역", "강남역"]
- 장소가 하나도 없으면 [] 를 출력한다.`;

/** 경로 텍스트 → 지명 목록 (LLM). 응답을 해석할 수 없으면 빈 배열. */
export async function extractPlaceNames(
  text: string,
  options: ChatOptions,
): Promise<string[]> {
  const content = await chatCompletion(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    options,
  );
  return normalizePlaceNames(parseJsonFromLlm(content));
}

/**
 * LLM 추출을 먼저 시도하고, LLM 자체가 쓸 수 없을 때(한도 초과·장애)만 규칙 기반으로 대체.
 * LLM이 정상 응답으로 "장소 없음([])"을 준 경우는 그 판단을 그대로 따른다.
 */
export async function extractWithFallback(
  text: string,
  primary: (text: string) => Promise<string[]>,
  fallback: (text: string) => string[],
): Promise<string[]> {
  try {
    return await primary(text);
  } catch (error) {
    if (!(error instanceof UpstreamError)) throw error;
    console.warn("[extract] LLM unavailable, using rule-based fallback:", error.message);
    return fallback(text);
  }
}
