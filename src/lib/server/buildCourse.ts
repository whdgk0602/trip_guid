import { selectSpots, SPOT_SOURCES, type Candidate } from "./curateSpots";
import type { GeoPlace } from "./kakao";

/** 반경을 넓혀가며 재검색 (feature-spec.md 5장 "주변 장소 부족") */
export const SEARCH_RADII_M = [500, 1000, 2000];
const MAX_ANCHORS = 3;

export type Spot = {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
};

export type SearchNearby = (anchors: GeoPlace[], radiusM: number) => Promise<Candidate[]>;

/** 검색 기준점: 지명이 많으면 출발·중간·도착 3곳만 (카카오 호출 수 제한) */
export function pickAnchors(places: GeoPlace[]): GeoPlace[] {
  if (places.length <= MAX_ANCHORS) return places;
  return [places[0], places[Math.floor(places.length / 2)], places[places.length - 1]];
}

/** FR-4(AI 텍스트 생성) 연동 전까지 쓰는 제목/소개 템플릿 */
export function templateCourseText(places: GeoPlace[]): { title: string; intro: string } {
  const first = places[0].query;
  const last = places[places.length - 1].query;
  if (places.length === 1) {
    return {
      title: `${first} 산책`,
      intro: `${first} 주변에서 들르기 좋은 곳들을 모았어요.`,
    };
  }
  return {
    title: `${first}에서 ${last}까지`,
    intro: `${first}에서 ${last}까지 가는 길에 들르기 좋은 곳들을 모았어요.`,
  };
}

function toSpot(candidate: Candidate, anchors: GeoPlace[]): Spot {
  const label = SPOT_SOURCES.find((s) => s.key === candidate.sourceKey)?.label ?? "";
  const anchor = anchors[candidate.anchorIndex]?.query ?? "";
  return {
    id: candidate.id,
    name: candidate.name,
    category: label,
    description: `${anchor} 근처의 ${candidate.categoryDetail}.`,
    address: candidate.address,
  };
}

/**
 * 경로 지점 주변 실제 장소로 스팟 `count`개 구성 (FR-3).
 * 부족하면 반경을 넓히고, 최대 반경에서도 부족하면 찾은 만큼만 반환한다.
 */
export async function buildSpots(
  places: GeoPlace[],
  count: number,
  { search }: { search: SearchNearby },
): Promise<Spot[]> {
  const anchors = pickAnchors(places);
  // 경로 지명 자체(예: "망리단길")가 스팟으로 다시 나오지 않게
  const anchorNames = new Set(places.flatMap((p) => [p.name, p.query]));

  let best: Candidate[] = [];
  for (const radius of SEARCH_RADII_M) {
    const candidates = (await search(anchors, radius)).filter(
      (c) => !anchorNames.has(c.name),
    );
    best = selectSpots(candidates, count);
    if (best.length >= count) break;
  }
  return best.map((c) => toSpot(c, anchors));
}
