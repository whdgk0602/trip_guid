import { describe, expect, test, vi } from "vitest";
import {
  buildSpots,
  pickAnchors,
  templateCourseText,
  type SearchNearby,
} from "./buildCourse";
import type { GeoPlace } from "./kakao";
import type { Candidate } from "./curateSpots";

function place(query: string, x = 127, y = 37.5): GeoPlace {
  return { query, name: query, address: "", x, y };
}

describe("pickAnchors", () => {
  test("keeps up to 3 anchors: first, middle, last", () => {
    const places = ["a", "b", "c", "d", "e"].map((q) => place(q));
    expect(pickAnchors(places).map((p) => p.query)).toEqual(["a", "c", "e"]);
  });

  test("returns all when 3 or fewer", () => {
    expect(pickAnchors([place("a"), place("b")])).toHaveLength(2);
  });
});

describe("templateCourseText", () => {
  test("names the route from first to last place", () => {
    const { title, intro } = templateCourseText([place("망원동"), place("망원한강공원")]);
    expect(title).toBe("망원동에서 망원한강공원까지");
    expect(intro).toContain("망원동");
  });

  test("uses a single-place title when there is only one place", () => {
    expect(templateCourseText([place("서울숲")]).title).toBe("서울숲 산책");
  });
});

function candidates(n: number, anchorIndex = 0): Candidate[] {
  const keys = ["cafe", "food", "park", "attraction", "culture"];
  return Array.from({ length: n }, (_, i) => ({
    id: `${anchorIndex}-${i}`,
    name: `장소${i}`,
    sourceKey: keys[i % keys.length],
    categoryDetail: "카페",
    address: "서울 어딘가",
    anchorIndex,
  }));
}

describe("buildSpots", () => {
  test("searches once at the first radius when enough spots are found", async () => {
    const search = vi.fn<SearchNearby>(async () => candidates(5));

    const spots = await buildSpots([place("강남역")], 3, { search });

    expect(spots).toHaveLength(3);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][1]).toBe(500);
  });

  test("expands the radius when there are not enough spots", async () => {
    const search = vi
      .fn()
      .mockResolvedValueOnce(candidates(1))
      .mockResolvedValueOnce(candidates(2))
      .mockResolvedValueOnce(candidates(5));

    const spots = await buildSpots([place("시골역")], 3, { search });

    expect(search.mock.calls.map((c) => c[1])).toEqual([500, 1000, 2000]);
    expect(spots).toHaveLength(3);
  });

  test("returns what it has after the largest radius", async () => {
    const search = vi.fn(async () => candidates(2));

    const spots = await buildSpots([place("시골역")], 5, { search });

    expect(spots).toHaveLength(2);
    expect(search).toHaveBeenCalledTimes(3);
  });

  test("maps spots to the result schema with a template description", async () => {
    const search = vi.fn(async () => candidates(3));

    const [spot] = await buildSpots([place("강남역")], 1, { search });

    expect(spot).toEqual({
      id: "0-0",
      name: "장소0",
      category: "카페",
      description: "강남역 근처의 카페.",
      address: "서울 어딘가",
    });
  });
});
