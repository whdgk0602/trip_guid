/** 카카오 로컬 검색 결과 중 큐레이션 판단에 쓰는 필드 */
export type KakaoPlaceLike = { place_name: string; category_name: string };

export type SpotSource = {
  key: string;
  /** 결과 화면 카테고리 칩에 표시되는 이름 */
  label: string;
  search:
    | { kind: "category"; code: string }
    | { kind: "keyword"; query: string };
  accept: (doc: KakaoPlaceLike) => boolean;
};

/**
 * 스팟 카테고리 우선순위. 무료(3개)는 앞의 3개 = 카페·식당·공원,
 * 프리미엄(5개)은 볼거리·문화까지. 카카오는 평점을 주지 않아서
 * "평점 기준"은 카카오 정확도 순위(sort=accuracy)로 대신한다.
 */
export const SPOT_SOURCES: SpotSource[] = [
  {
    key: "cafe",
    label: "카페",
    search: { kind: "category", code: "CE7" },
    // CE7에 만화카페·보드카페가 섞여 나옴
    accept: (doc) => doc.category_name.startsWith("음식점 > 카페"),
  },
  {
    key: "food",
    label: "식당",
    search: { kind: "category", code: "FD6" },
    accept: () => true,
  },
  {
    key: "park",
    label: "공원",
    // 카카오에 공원 카테고리 코드가 없어 키워드 검색 — "OO공원점" 편의점 등 제외
    search: { kind: "keyword", query: "공원" },
    accept: (doc) => doc.category_name.includes("> 공원"),
  },
  {
    key: "attraction",
    label: "볼거리",
    search: { kind: "category", code: "AT4" },
    accept: () => true,
  },
  {
    key: "culture",
    label: "문화",
    search: { kind: "category", code: "CT1" },
    accept: () => true,
  },
];

export function isAcceptable(source: SpotSource, doc: KakaoPlaceLike): boolean {
  return source.accept(doc);
}

export type Candidate = {
  /** 카카오 장소 ID */
  id: string;
  name: string;
  sourceKey: string;
  /** 카카오 카테고리의 마지막 단계 (예: "커피전문점") */
  categoryDetail: string;
  address: string;
  /** 어느 경로 지점(anchor) 주변에서 찾았는지 — 경로 순서 */
  anchorIndex: number;
};

/**
 * 후보 중 `count`개를 고른다 (FR-3).
 * 1) 카테고리가 겹치지 않게 SPOT_SOURCES 순서대로 하나씩
 * 2) 카테고리가 모자라면 같은 카테고리에서 추가
 * 3) 경로 지점을 돌아가며 골라 코스가 한쪽에 몰리지 않게 하고, 결과는 경로 순서로 정렬
 * 후보는 카카오 정확도 순으로 들어온다고 가정하고 앞쪽을 우선한다.
 */
export function selectSpots(candidates: Candidate[], count: number): Candidate[] {
  const seen = new Set<string>();
  const unique = candidates.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const anchors = [...new Set(unique.map((c) => c.anchorIndex))].sort((a, b) => a - b);
  const used = new Set<string>();
  const selected: Candidate[] = [];

  let progressed = true;
  while (selected.length < count && progressed) {
    progressed = false;
    for (const source of SPOT_SOURCES) {
      if (selected.length >= count) break;
      const pool = unique.filter((c) => c.sourceKey === source.key && !used.has(c.id));
      if (pool.length === 0) continue;

      const targetAnchor = anchors[selected.length % anchors.length];
      const pick = pool.find((c) => c.anchorIndex === targetAnchor) ?? pool[0];
      used.add(pick.id);
      selected.push(pick);
      progressed = true;
    }
  }

  return selected
    .map((spot, order) => ({ spot, order }))
    .sort((a, b) => a.spot.anchorIndex - b.spot.anchorIndex || a.order - b.order)
    .map(({ spot }) => spot);
}
