import { describe, expect, test, vi } from "vitest";
import {
  normalizePlaceNames,
  resolveRoutePlaces,
  RouteResolveError,
} from "./resolveRoutePlaces";

const gangnam = { query: "강남역", name: "강남역", address: "", x: 127.028, y: 37.498 };
const yeoksam = { query: "역삼역", name: "역삼역", address: "", x: 127.036, y: 37.5 };

describe("normalizePlaceNames", () => {
  test("accepts a plain array or {places: [...]}", () => {
    expect(normalizePlaceNames(["강남역"])).toEqual(["강남역"]);
    expect(normalizePlaceNames({ places: ["강남역"] })).toEqual(["강남역"]);
  });

  test("trims, drops empty/non-string items, dedupes, caps at 5", () => {
    expect(
      normalizePlaceNames([" 강남역 ", "", 3, "강남역", "a", "b", "c", "d", "e"]),
    ).toEqual(["강남역", "a", "b", "c", "d"]);
  });

  test("returns [] for anything else", () => {
    expect(normalizePlaceNames(null)).toEqual([]);
    expect(normalizePlaceNames({ foo: 1 })).toEqual([]);
  });
});

describe("resolveRoutePlaces", () => {
  test("geocodes every extracted name and keeps route order", async () => {
    const geocode = vi.fn(async (name: string) =>
      name === "강남역" ? gangnam : yeoksam,
    );

    const result = await resolveRoutePlaces("강남역에서 역삼역까지 퇴근길", {
      extractPlaceNames: async () => ["강남역", "역삼역"],
      geocode,
    });

    expect(result).toEqual([gangnam, yeoksam]);
  });

  test("geocodes each name near the previously resolved place", async () => {
    const geocode = vi.fn(async (name: string) =>
      name === "강남역" ? gangnam : yeoksam,
    );

    await resolveRoutePlaces("강남역에서 역삼역까지 퇴근길", {
      extractPlaceNames: async () => ["강남역", "역삼역"],
      geocode,
    });

    expect(geocode.mock.calls).toEqual([
      ["강남역", undefined],
      ["역삼역", gangnam],
    ]);
  });

  test("skips names that fail to geocode as long as one succeeds", async () => {
    const result = await resolveRoutePlaces("강남역에서 어딘가까지", {
      extractPlaceNames: async () => ["강남역", "어딘가"],
      geocode: async (name) => (name === "강남역" ? gangnam : null),
    });

    expect(result).toEqual([gangnam]);
  });

  test("drops a place that lands far away from the previous route point", async () => {
    const deoksugung = { query: "덕수궁", name: "덕수궁", address: "", x: 126.975, y: 37.565 };
    const chuncheon = { query: "돌담길", name: "돌담길", address: "춘천", x: 127.73, y: 37.87 };
    const jeongdong = { query: "정동길", name: "정동길", address: "", x: 126.972, y: 37.566 };

    const result = await resolveRoutePlaces("덕수궁 돌담길 따라 정동길", {
      extractPlaceNames: async () => ["덕수궁", "돌담길", "정동길"],
      geocode: async (name) =>
        ({ 덕수궁: deoksugung, 돌담길: chuncheon, 정동길: jeongdong })[name] ?? null,
    });

    expect(result.map((p) => p.query)).toEqual(["덕수궁", "정동길"]);
  });

  test("drops duplicates that geocode to the same coordinates", async () => {
    const result = await resolveRoutePlaces("강남역 강남역 2호선", {
      extractPlaceNames: async () => ["강남역", "강남역 2호선"],
      geocode: async () => gangnam,
    });

    expect(result).toHaveLength(1);
  });

  test("throws PLACE_NOT_FOUND when no names are extracted", async () => {
    await expect(
      resolveRoutePlaces("그냥 집에 가는 길이에요", {
        extractPlaceNames: async () => [],
        geocode: async () => gangnam,
      }),
    ).rejects.toMatchObject({ code: "PLACE_NOT_FOUND" });
  });

  test("throws GEOCODE_FAILED when no name can be geocoded", async () => {
    const promise = resolveRoutePlaces("강냄역에서 녁삼역까지", {
      extractPlaceNames: async () => ["강냄역", "녁삼역"],
      geocode: async () => null,
    });

    await expect(promise).rejects.toBeInstanceOf(RouteResolveError);
    await expect(promise).rejects.toMatchObject({ code: "GEOCODE_FAILED" });
  });
});
