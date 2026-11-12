import { describe, expect, test, vi } from "vitest";
import { geocodePlace, isAdministrativeArea, searchNearbyCandidates } from "./kakao";

describe("searchNearbyCandidates", () => {
  const anchor = { query: "망원동", name: "망원동", address: "", x: 126.9, y: 37.55 };

  function routedFetch() {
    return vi.fn(async (url: URL | RequestInfo) => {
      const u = new URL(String(url));
      const code = u.searchParams.get("category_group_code");
      const query = u.searchParams.get("query");
      const docs =
        code === "CE7"
          ? [
              { id: "c1", place_name: "벌툰", category_name: "가정,생활 > 여가시설 > 만화카페", x: "1", y: "1", address_name: "a" },
              { id: "c2", place_name: "피피커피", category_name: "음식점 > 카페 > 커피전문점", x: "1", y: "1", road_address_name: "동교로 23", address_name: "a" },
            ]
          : query === "공원"
            ? [
                { id: "p1", place_name: "옹달샘어린이공원", category_name: "여행 > 공원", x: "1", y: "1", address_name: "a" },
                { id: "p2", place_name: "CU 양화공원점", category_name: "가정,생활 > 편의점 > CU", x: "1", y: "1", address_name: "a" },
                { id: "p3", place_name: "망원한강공원", category_name: "여행 > 공원 > 도시근린공원", x: "1", y: "1", address_name: "a" },
              ]
            : [];
      return kakaoResponse(docs);
    });
  }

  test("queries every source around the anchor with the given radius", async () => {
    const fetchFn = routedFetch();
    await searchNearbyCandidates([anchor], 700, { apiKey: "k", fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(5);
    const params = new URL(String(fetchFn.mock.calls[0][0])).searchParams;
    expect(params.get("radius")).toBe("700");
    expect(params.get("x")).toBe("126.9");
    expect(params.get("sort")).toBe("accuracy");
  });

  test("filters out non-cafes and non-parks, ranks big parks first", async () => {
    const result = await searchNearbyCandidates([anchor], 500, { apiKey: "k", fetchFn: routedFetch() });

    expect(result.filter((c) => c.sourceKey === "cafe").map((c) => c.name)).toEqual(["피피커피"]);
    expect(result.filter((c) => c.sourceKey === "park").map((c) => c.name)).toEqual([
      "망원한강공원",
      "옹달샘어린이공원",
    ]);
    expect(result.find((c) => c.id === "c2")).toMatchObject({
      categoryDetail: "커피전문점",
      address: "동교로 23",
      anchorIndex: 0,
    });
  });
});

describe("isAdministrativeArea", () => {
  test("detects 동/가/구 style area names", () => {
    expect(isAdministrativeArea("연남동")).toBe(true);
    expect(isAdministrativeArea("성수동1가")).toBe(true);
    expect(isAdministrativeArea("마포구")).toBe(true);
  });

  test("does not match stations, parks or multi-word names", () => {
    expect(isAdministrativeArea("강남역")).toBe(false);
    expect(isAdministrativeArea("서울숲")).toBe(false);
    expect(isAdministrativeArea("성수동 카페거리")).toBe(false);
  });
});
import { UpstreamError } from "./llm";

function kakaoResponse(documents: object[]) {
  return new Response(JSON.stringify({ documents }), { status: 200 });
}

describe("geocodePlace", () => {
  test("returns the first keyword-search hit with numeric coordinates", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      kakaoResponse([
        {
          place_name: "강남역 2호선",
          address_name: "서울 강남구 역삼동 858",
          x: "127.0280",
          y: "37.4980",
        },
      ]),
    );

    const result = await geocodePlace("강남역", { apiKey: "k", fetchFn });

    expect(result).toEqual({
      query: "강남역",
      name: "강남역 2호선",
      address: "서울 강남구 역삼동 858",
      x: 127.028,
      y: 37.498,
    });
    const [url, init] = fetchFn.mock.calls[0];
    expect(String(url)).toContain("/v2/local/search/keyword.json");
    expect(new URL(String(url)).searchParams.get("query")).toBe("강남역");
    expect(init.headers.Authorization).toBe("KakaoAK k");
  });

  test("searches by address first for administrative areas", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      kakaoResponse([
        { address_name: "서울 마포구 연남동", x: "126.92", y: "37.56" },
      ]),
    );

    const result = await geocodePlace("연남동", { apiKey: "k", fetchFn });

    expect(String(fetchFn.mock.calls[0][0])).toContain(
      "/v2/local/search/address.json",
    );
    expect(result).toMatchObject({ name: "서울 마포구 연남동" });
  });

  test("falls back to address search when keyword search finds nothing", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(kakaoResponse([]))
      .mockResolvedValueOnce(
        kakaoResponse([
          { address_name: "서울 마포구 망원동", x: "126.90", y: "37.55" },
        ]),
      );

    const result = await geocodePlace("망리단길", { apiKey: "k", fetchFn });

    expect(String(fetchFn.mock.calls[0][0])).toContain(
      "/v2/local/search/keyword.json",
    );
    expect(String(fetchFn.mock.calls[1][0])).toContain(
      "/v2/local/search/address.json",
    );
    expect(result).toMatchObject({ name: "서울 마포구 망원동", x: 126.9 });
  });

  test("with `near`, picks the candidate closest to the previous route point", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      kakaoResponse([
        { place_name: "원대리", address_name: "충북 제천시 수산면 원대리", x: "128.18", y: "36.93" },
        { place_name: "원대리", address_name: "강원 인제군 인제읍 원대리", x: "128.22", y: "38.02" },
      ]),
    );
    const inje = { x: 128.17, y: 38.07 };

    const result = await geocodePlace("원대리", { apiKey: "k", fetchFn }, inje);

    expect(result?.address).toBe("강원 인제군 인제읍 원대리");
    expect(new URL(String(fetchFn.mock.calls[0][0])).searchParams.get("size")).toBe("5");
  });

  test("returns null when neither search finds the place", async () => {
    const fetchFn = vi.fn().mockResolvedValue(kakaoResponse([]));

    expect(await geocodePlace("없는곳", { apiKey: "k", fetchFn })).toBeNull();
  });

  test("throws UpstreamError when Kakao returns an error status", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 401 }));

    await expect(
      geocodePlace("강남역", { apiKey: "k", fetchFn }),
    ).rejects.toBeInstanceOf(UpstreamError);
  });
});
