import { describe, expect, test, vi } from "vitest";
import { createGenerateHandler, type GenerateDeps } from "./handler";
import { UpstreamError } from "@/lib/server/llm";
import { RouteResolveError } from "@/lib/server/resolveRoutePlaces";
import { composeCourse } from "@/lib/server/courseText";

const TEXT = "출근길에 대림역에서 2호선 갈아타고 강남역에서 내려요";
const places = [
  { query: "대림역", name: "대림역 2호선", address: "", x: 126.89, y: 37.49 },
  { query: "강남역", name: "강남역 2호선", address: "", x: 127.03, y: 37.5 },
];

function spots(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    name: `장소${i}`,
    category: "카페",
    description: "대림역 근처의 카페.",
    address: "서울",
  }));
}

function post(body: unknown) {
  return new Request("http://localhost/api/routes/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function handlerWith(overrides: Partial<GenerateDeps> = {}) {
  return createGenerateHandler({
    resolvePlaces: async () => places,
    buildSpots: async (_places, count) => spots(count),
    writeCourse: async (p, s) => composeCourse(p, s, null),
    ...overrides,
  });
}

describe("POST /api/routes/generate", () => {
  test("returns a course JSON matching the schema, with 3 spots", async () => {
    const response = await handlerWith()(post({ text: TEXT }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.title).toBe("대림역에서 강남역까지");
    expect(typeof body.intro).toBe("string");
    expect(body.spots).toHaveLength(3);
    expect(body.requestedSpotCount).toBe(3);
    for (const spot of body.spots) {
      expect(typeof spot.id).toBe("string");
      expect(typeof spot.name).toBe("string");
      expect(typeof spot.category).toBe("string");
      expect(typeof spot.description).toBe("string");
      expect(typeof spot.address).toBe("string");
    }
  });

  test("asks for 5 spots when tier is 'premium'", async () => {
    const buildSpots = vi.fn(async (_p: unknown, count: number) => spots(count));
    const body = await (
      await handlerWith({ buildSpots })(post({ text: TEXT, tier: "premium" }))
    ).json();

    expect(buildSpots).toHaveBeenCalledWith(places, 5);
    expect(body.spots).toHaveLength(5);
    expect(body.requestedSpotCount).toBe(5);
  });

  test("passes through fewer spots when the area is sparse", async () => {
    const body = await (
      await handlerWith({ buildSpots: async () => spots(2) })(post({ text: TEXT }))
    ).json();
    expect(body.spots).toHaveLength(2);
    expect(body.requestedSpotCount).toBe(3);
  });

  test("returns 422 NO_NEARBY_SPOTS when nothing is found nearby", async () => {
    const response = await handlerWith({ buildSpots: async () => [] })(post({ text: TEXT }));
    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe("NO_NEARBY_SPOTS");
  });

  test("uses the generated course text", async () => {
    const writeCourse = vi.fn(async (_p: unknown, s: ReturnType<typeof spots>) => ({
      title: "강바람 산책",
      intro: "느긋한 퇴근길",
      spots: s.map((spot) => ({ ...spot, description: "생성된 설명" })),
    }));
    const body = await (await handlerWith({ writeCourse })(post({ text: TEXT }))).json();

    expect(writeCourse).toHaveBeenCalledWith(places, spots(3));
    expect(body.title).toBe("강바람 산책");
    expect(body.spots[0].description).toBe("생성된 설명");
  });

  test("includes the resolved places with coordinates", async () => {
    const body = await (await handlerWith()(post({ text: TEXT }))).json();
    expect(body.places).toEqual(places);
  });

  test("rejects text outside 10~300 chars with 400 INVALID_INPUT", async () => {
    const response = await handlerWith()(post({ text: "짧음" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("INVALID_INPUT");
  });

  test("maps PLACE_NOT_FOUND / GEOCODE_FAILED to 422 with the code", async () => {
    for (const code of ["PLACE_NOT_FOUND", "GEOCODE_FAILED"] as const) {
      const handler = handlerWith({
        resolvePlaces: async () => {
          throw new RouteResolveError(code);
        },
      });
      const response = await handler(post({ text: TEXT }));
      expect(response.status).toBe(422);
      expect((await response.json()).error).toBe(code);
    }
  });

  test("maps upstream failures in either step to 502 UPSTREAM_ERROR", async () => {
    const fail = async () => {
      throw new UpstreamError("kakao 500");
    };
    for (const handler of [
      handlerWith({ resolvePlaces: fail }),
      handlerWith({ buildSpots: fail }),
    ]) {
      const response = await handler(post({ text: TEXT }));
      expect(response.status).toBe(502);
      expect((await response.json()).error).toBe("UPSTREAM_ERROR");
    }
  });
});
