import { describe, expect, test } from "vitest";
import {
  SPOT_SOURCES,
  isAcceptable,
  selectSpots,
  type Candidate,
} from "./curateSpots";

function cand(
  id: string,
  sourceKey: string,
  anchorIndex: number,
  overrides: Partial<Candidate> = {},
): Candidate {
  return {
    id,
    name: `장소${id}`,
    sourceKey,
    categoryDetail: "카페",
    address: "서울",
    anchorIndex,
    ...overrides,
  };
}

describe("SPOT_SOURCES", () => {
  test("free tier's first three sources are cafe, food, park", () => {
    expect(SPOT_SOURCES.slice(0, 3).map((s) => s.label)).toEqual([
      "카페",
      "식당",
      "공원",
    ]);
  });
});

describe("isAcceptable", () => {
  const cafe = SPOT_SOURCES.find((s) => s.key === "cafe")!;
  const park = SPOT_SOURCES.find((s) => s.key === "park")!;

  test("cafe accepts real cafes but not comic/board-game cafes", () => {
    expect(isAcceptable(cafe, { place_name: "피피커피", category_name: "음식점 > 카페 > 커피전문점" })).toBe(true);
    expect(isAcceptable(cafe, { place_name: "벌툰", category_name: "가정,생활 > 여가시설 > 만화방 > 만화카페" })).toBe(false);
  });

  test("park keyword results must actually be parks", () => {
    expect(isAcceptable(park, { place_name: "망원한강공원", category_name: "여행 > 공원 > 도시근린공원" })).toBe(true);
    expect(isAcceptable(park, { place_name: "CU 마포양화공원점", category_name: "가정,생활 > 편의점 > CU" })).toBe(false);
  });
});

describe("selectSpots", () => {
  test("picks one spot per category in source order", () => {
    const spots = selectSpots(
      [cand("1", "cafe", 0), cand("2", "cafe", 0), cand("3", "food", 0), cand("4", "park", 0)],
      3,
    );
    expect(spots.map((s) => s.sourceKey)).toEqual(["cafe", "food", "park"]);
  });

  test("skips a missing category and fills from the next ones", () => {
    const spots = selectSpots(
      [cand("1", "cafe", 0), cand("3", "food", 0), cand("5", "attraction", 0)],
      3,
    );
    expect(spots.map((s) => s.sourceKey)).toEqual(["cafe", "food", "attraction"]);
  });

  test("allows repeated categories only when there are not enough categories", () => {
    const spots = selectSpots(
      [cand("1", "cafe", 0), cand("2", "cafe", 0), cand("3", "food", 0)],
      3,
    );
    expect(spots).toHaveLength(3);
    expect(spots.map((s) => s.id).sort()).toEqual(["1", "2", "3"]);
  });

  test("returns fewer spots when candidates run out", () => {
    expect(selectSpots([cand("1", "cafe", 0)], 3)).toHaveLength(1);
  });

  test("never returns the same place twice", () => {
    const spots = selectSpots(
      [cand("1", "cafe", 0), cand("1", "cafe", 1), cand("1", "food", 0)],
      3,
    );
    expect(spots).toHaveLength(1);
  });

  test("spreads spots across route anchors and orders them along the route", () => {
    const spots = selectSpots(
      [
        cand("a", "cafe", 0),
        cand("b", "cafe", 1),
        cand("c", "food", 0),
        cand("d", "food", 1),
        cand("e", "park", 0),
        cand("f", "park", 1),
      ],
      3,
    );
    const anchors = spots.map((s) => s.anchorIndex);
    expect(new Set(anchors).size).toBe(2);
    expect(anchors).toEqual([...anchors].sort((x, y) => x - y));
  });

  test("prefers candidates earlier in Kakao's accuracy ranking", () => {
    const spots = selectSpots([cand("best", "cafe", 0), cand("second", "cafe", 0)], 1);
    expect(spots[0].id).toBe("best");
  });
});
