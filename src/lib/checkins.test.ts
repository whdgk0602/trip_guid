import { describe, expect, test } from "vitest";
import {
  addCheckin,
  buildTravelogue,
  isRouteComplete,
  loadCheckins,
  loadTravelogue,
  persistCheckins,
  persistTravelogue,
} from "./checkins";

function createFakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

const spots = [
  { id: "spot-1", name: "대림 커피" },
  { id: "spot-2", name: "골목 식당" },
];

describe("addCheckin", () => {
  test("appends a checkin for a new spot", () => {
    const result = addCheckin([], "spot-1", "커피가 맛있었다");

    expect(result).toEqual([{ spotId: "spot-1", note: "커피가 맛있었다" }]);
  });

  test("replaces the existing checkin for the same spot instead of duplicating it", () => {
    const existing = addCheckin([], "spot-1", "첫 기록");

    const result = addCheckin(existing, "spot-1", "고친 기록");

    expect(result).toEqual([{ spotId: "spot-1", note: "고친 기록" }]);
  });

  test("keeps checkins for other spots untouched", () => {
    const existing = addCheckin([], "spot-1", "기록 1");

    const result = addCheckin(existing, "spot-2", "기록 2");

    expect(result).toEqual([
      { spotId: "spot-1", note: "기록 1" },
      { spotId: "spot-2", note: "기록 2" },
    ]);
  });
});

describe("isRouteComplete", () => {
  test("returns false when no spots have a checkin", () => {
    expect(isRouteComplete(spots, [])).toBe(false);
  });

  test("returns false when some spots are missing a checkin", () => {
    const checkins = addCheckin([], "spot-1", "기록");

    expect(isRouteComplete(spots, checkins)).toBe(false);
  });

  test("returns true when every spot has a checkin", () => {
    const checkins = addCheckin(
      addCheckin([], "spot-1", "기록 1"),
      "spot-2",
      "기록 2",
    );

    expect(isRouteComplete(spots, checkins)).toBe(true);
  });
});

describe("buildTravelogue", () => {
  test("weaves the course title and each spot's checkin note into intro/body/conclusion", () => {
    const checkins = addCheckin(
      addCheckin([], "spot-1", "커피가 맛있었다"),
      "spot-2",
      "백반이 든든했다",
    );

    const result = buildTravelogue("강남역 골목 산책", spots, checkins);

    expect(result).toContain("강남역 골목 산책");
    expect(result).toContain("대림 커피");
    expect(result).toContain("커피가 맛있었다");
    expect(result).toContain("골목 식당");
    expect(result).toContain("백반이 든든했다");
  });
});

describe("checkins storage", () => {
  test("loadCheckins returns an empty array when nothing is stored", () => {
    const storage = createFakeStorage();

    expect(loadCheckins(storage, "anon-1", "route-1")).toEqual([]);
  });

  test("persistCheckins then loadCheckins round-trips the data", () => {
    const storage = createFakeStorage();
    const checkins = addCheckin([], "spot-1", "기록");

    persistCheckins(storage, "anon-1", "route-1", checkins);

    expect(loadCheckins(storage, "anon-1", "route-1")).toEqual(checkins);
  });

  test("keeps checkins separate per route", () => {
    const storage = createFakeStorage();
    persistCheckins(storage, "anon-1", "route-1", addCheckin([], "spot-1", "기록"));

    expect(loadCheckins(storage, "anon-1", "route-2")).toEqual([]);
  });
});

describe("travelogue storage", () => {
  test("loadTravelogue returns null when nothing is stored", () => {
    const storage = createFakeStorage();

    expect(loadTravelogue(storage, "anon-1", "route-1")).toBeNull();
  });

  test("persistTravelogue then loadTravelogue round-trips the text", () => {
    const storage = createFakeStorage();

    persistTravelogue(storage, "anon-1", "route-1", "여행기 내용");

    expect(loadTravelogue(storage, "anon-1", "route-1")).toBe("여행기 내용");
  });
});
