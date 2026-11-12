import { describe, expect, test, vi } from "vitest";
import { geocodePlace, isAdministrativeArea } from "./kakao";

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
