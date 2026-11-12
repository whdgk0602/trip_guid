import { UpstreamError, type FetchFn } from "./llm";

const KAKAO_LOCAL_BASE = "https://dapi.kakao.com/v2/local/search";
const TIMEOUT_MS = 8_000;

export type GeoPlace = {
  /** LLM이 추출한 원래 지명 */
  query: string;
  /** 카카오가 돌려준 장소명(키워드 검색) 또는 주소(주소 검색) */
  name: string;
  address: string;
  /** 경도 */
  x: number;
  /** 위도 */
  y: number;
};

type KakaoOptions = { apiKey: string; fetchFn?: FetchFn };

type KakaoDocument = {
  place_name?: string;
  address_name?: string;
  x: string;
  y: string;
};

async function searchKakao(
  kind: "keyword" | "address",
  query: string,
  { apiKey, fetchFn = fetch }: KakaoOptions,
): Promise<KakaoDocument | null> {
  const url = new URL(`${KAKAO_LOCAL_BASE}/${kind}.json`);
  url.searchParams.set("query", query);
  url.searchParams.set("size", "1");

  let response: Response;
  try {
    response = await fetchFn(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new UpstreamError(`kakao ${kind} request failed: ${String(error)}`);
  }

  if (!response.ok) {
    throw new UpstreamError(`kakao ${kind} responded ${response.status}`);
  }

  const data = await response.json().catch(() => null);
  return data?.documents?.[0] ?? null;
}

/** "연남동", "성수동1가", "마포구" 같은 행정구역명인지 */
export function isAdministrativeArea(query: string): boolean {
  return /(동|동\d+가|구|읍|면|리)$/.test(query.trim()) && !/\s/.test(query.trim());
}

/**
 * 지명 → 좌표. 역·가게·랜드마크는 키워드 검색이 잘 잡고, 행정구역은 키워드 검색이
 * 엉뚱한 길 이름을 돌려주는 경우가 있어("연남동" → "끼리끼리5길") 주소 검색을 먼저 쓴다.
 * 둘 다 못 찾으면 null (호출 측에서 GEOCODE_FAILED 판단).
 */
export async function geocodePlace(
  query: string,
  options: KakaoOptions,
): Promise<GeoPlace | null> {
  const order: Array<"keyword" | "address"> = isAdministrativeArea(query)
    ? ["address", "keyword"]
    : ["keyword", "address"];
  const doc =
    (await searchKakao(order[0], query, options)) ??
    (await searchKakao(order[1], query, options));
  if (!doc) return null;

  const x = Number(doc.x);
  const y = Number(doc.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return {
    query,
    name: doc.place_name || doc.address_name || query,
    address: doc.address_name ?? "",
    x,
    y,
  };
}
