import { SPOT_SOURCES, type Candidate } from "./curateSpots";
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
  id?: string;
  place_name?: string;
  category_name?: string;
  address_name?: string;
  road_address_name?: string;
  x: string;
  y: string;
};

/** 두 좌표 사이 대략적 거리(km) — 후보 비교용이라 equirectangular 근사로 충분 */
export function distanceKm(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const toRad = Math.PI / 180;
  const dx = (a.x - b.x) * Math.cos(((a.y + b.y) / 2) * toRad);
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy) * toRad * 6371;
}

const GEOCODE_CANDIDATES = "5";

/**
 * 상위 후보 중 하나를 고른다. `near`(앞서 찾은 경로 지점)가 있으면 그와 가장 가까운 후보 —
 * "원대리"(인제/제천), "한강공원"(망원/여의도/뚝섬…)처럼 같은 이름이 여러 곳일 때
 * 경로에서 동떨어진 곳이 잡히지 않게. 없으면 카카오 정확도 1순위.
 */
async function searchKakao(
  kind: "keyword" | "address",
  query: string,
  options: KakaoOptions,
  near?: { x: number; y: number },
): Promise<KakaoDocument | null> {
  const docs = (
    await kakaoGet(kind, { query, size: near ? GEOCODE_CANDIDATES : "1" }, options)
  ).filter((doc) => Number.isFinite(Number(doc.x)) && Number.isFinite(Number(doc.y)));
  if (docs.length === 0) return null;
  if (!near) return docs[0];

  return docs.reduce((best, doc) =>
    distanceKm(near, { x: Number(doc.x), y: Number(doc.y) }) <
    distanceKm(near, { x: Number(best.x), y: Number(best.y) })
      ? doc
      : best,
  );
}

async function kakaoGet(
  kind: "keyword" | "address" | "category",
  params: Record<string, string>,
  { apiKey, fetchFn = fetch }: KakaoOptions,
): Promise<KakaoDocument[]> {
  const url = new URL(`${KAKAO_LOCAL_BASE}/${kind}.json`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

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
  return Array.isArray(data?.documents) ? data.documents : [];
}

const NEARBY_SIZE = "10";

/** 작은 놀이터형 "OO어린이공원"보다 큰 공원을 앞에 둔다 (정렬은 안정적) */
function parkRank(name: string): number {
  return name.includes("어린이공원") ? 1 : 0;
}

/**
 * 각 경로 지점(anchor) 주변을 SPOT_SOURCES 카테고리별로 검색해 후보 목록을 만든다.
 * anchor × 카테고리 조합을 병렬 호출 (최대 3 × 5 = 15회).
 */
export async function searchNearbyCandidates(
  anchors: GeoPlace[],
  radiusM: number,
  options: KakaoOptions,
): Promise<Candidate[]> {
  const jobs = anchors.flatMap((anchor, anchorIndex) =>
    SPOT_SOURCES.map(async (source) => {
      const params: Record<string, string> = {
        x: String(anchor.x),
        y: String(anchor.y),
        radius: String(radiusM),
        size: NEARBY_SIZE,
        sort: "accuracy",
      };
      const docs =
        source.search.kind === "category"
          ? await kakaoGet("category", { ...params, category_group_code: source.search.code }, options)
          : await kakaoGet("keyword", { ...params, query: source.search.query }, options);

      const accepted = docs
        .filter((doc) => doc.id && doc.place_name)
        .filter((doc) =>
          source.accept({ place_name: doc.place_name!, category_name: doc.category_name ?? "" }),
        );
      if (source.key === "park") {
        accepted.sort((a, b) => parkRank(a.place_name!) - parkRank(b.place_name!));
      }

      return accepted.map(
        (doc): Candidate => ({
          id: doc.id!,
          name: doc.place_name!,
          sourceKey: source.key,
          categoryDetail: (doc.category_name ?? source.label).split(">").pop()!.trim(),
          address: doc.road_address_name || doc.address_name || "",
          anchorIndex,
        }),
      );
    }),
  );

  return (await Promise.all(jobs)).flat();
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
  near?: { x: number; y: number },
): Promise<GeoPlace | null> {
  const order: Array<"keyword" | "address"> = isAdministrativeArea(query)
    ? ["address", "keyword"]
    : ["keyword", "address"];
  const doc =
    (await searchKakao(order[0], query, options, near)) ??
    (await searchKakao(order[1], query, options, near));
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
