import { distanceKm, type GeoPlace } from "./kakao";

const MAX_PLACES = 5;
/**
 * 직전 경로 지점에서 이보다 멀면 같은 이름의 다른 지역으로 보고 버린다
 * (예: "돌담길" → 춘천). 일상 경로 한 구간이 30km를 넘는 경우는 드물다.
 */
export const MAX_HOP_KM = 30;

export type RouteResolveErrorCode = "PLACE_NOT_FOUND" | "GEOCODE_FAILED";

/** 사용자 입력으로는 장소를 특정할 수 없음 — 재입력 안내 대상 (feature-spec.md 5장) */
export class RouteResolveError extends Error {
  constructor(public readonly code: RouteResolveErrorCode) {
    super(code);
    this.name = "RouteResolveError";
  }
}

export type ResolveDeps = {
  extractPlaceNames: (text: string) => Promise<string[]>;
  /** `near`: 앞서 찾은 경로 지점 — 같은 이름의 먼 곳 대신 가까운 후보를 고르게 */
  geocode: (name: string, near?: GeoPlace) => Promise<GeoPlace | null>;
};

/** LLM 출력(배열 또는 {places: [...]})을 정리된 지명 목록으로 */
export function normalizePlaceNames(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { places?: unknown }).places)
      ? (raw as { places: unknown[] }).places
      : [];

  const names = list
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(names)].slice(0, MAX_PLACES);
}

/**
 * 경로 텍스트 → 좌표가 확보된 장소 목록 (FR-2).
 * 일부 지명만 실패하면 건너뛰고, 하나도 못 찾을 때만 에러.
 */
export async function resolveRoutePlaces(
  text: string,
  { extractPlaceNames, geocode }: ResolveDeps,
): Promise<GeoPlace[]> {
  const names = await extractPlaceNames(text);
  if (names.length === 0) {
    throw new RouteResolveError("PLACE_NOT_FOUND");
  }

  // 순차 지오코딩: 각 지명을 직전에 찾은 지점 기준으로 해석 (경로는 이어져 있으므로)
  const seen = new Set<string>();
  const places: GeoPlace[] = [];
  for (const name of names) {
    const previous = places[places.length - 1];
    const place = await geocode(name, previous);
    if (!place) continue;
    if (previous && distanceKm(previous, place) > MAX_HOP_KM) continue;
    const key = `${place.x.toFixed(4)},${place.y.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
  }

  if (places.length === 0) {
    throw new RouteResolveError("GEOCODE_FAILED");
  }
  return places;
}
