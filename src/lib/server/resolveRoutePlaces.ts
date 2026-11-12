import type { GeoPlace } from "./kakao";

const MAX_PLACES = 5;

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
  geocode: (name: string) => Promise<GeoPlace | null>;
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

  const geocoded = await Promise.all(names.map((name) => geocode(name)));

  const seen = new Set<string>();
  const places = geocoded.filter((place): place is GeoPlace => {
    if (!place) return false;
    const key = `${place.x.toFixed(4)},${place.y.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (places.length === 0) {
    throw new RouteResolveError("GEOCODE_FAILED");
  }
  return places;
}
