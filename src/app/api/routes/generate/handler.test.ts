import { describe, expect, test } from "vitest";
import { createGenerateHandler } from "./handler";
import { UpstreamError } from "@/lib/server/llm";
import { RouteResolveError } from "@/lib/server/resolveRoutePlaces";

const TEXT = "출근길에 대림역에서 2호선 갈아타고 강남역에서 내려요";
const places = [
  { query: "대림역", name: "대림역 2호선", address: "", x: 126.89, y: 37.49 },
  { query: "강남역", name: "강남역 2호선", address: "", x: 127.03, y: 37.5 },
];

function post(body: unknown) {
  return new Request("http://localhost/api/routes/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const okHandler = createGenerateHandler({ resolvePlaces: async () => places });

describe("POST /api/routes/generate", () => {
  test("returns a course JSON matching the schema, with 3 spots", async () => {
    const response = await okHandler(post({ text: TEXT }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(typeof body.title).toBe("string");
    expect(typeof body.intro).toBe("string");
    expect(body.spots).toHaveLength(3);
    for (const spot of body.spots) {
      expect(typeof spot.id).toBe("string");
      expect(typeof spot.name).toBe("string");
      expect(typeof spot.category).toBe("string");
      expect(typeof spot.description).toBe("string");
      expect(typeof spot.address).toBe("string");
    }
  });

  test("returns 5 spots when tier is 'premium'", async () => {
    const body = await (await okHandler(post({ text: TEXT, tier: "premium" }))).json();
    expect(body.spots).toHaveLength(5);
  });

  test("includes the resolved places with coordinates", async () => {
    const body = await (await okHandler(post({ text: TEXT }))).json();
    expect(body.places).toEqual(places);
  });

  test("rejects text outside 10~300 chars with 400 INVALID_INPUT", async () => {
    const response = await okHandler(post({ text: "짧음" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("INVALID_INPUT");
  });

  test("maps PLACE_NOT_FOUND / GEOCODE_FAILED to 422 with the code", async () => {
    for (const code of ["PLACE_NOT_FOUND", "GEOCODE_FAILED"] as const) {
      const handler = createGenerateHandler({
        resolvePlaces: async () => {
          throw new RouteResolveError(code);
        },
      });
      const response = await handler(post({ text: TEXT }));
      expect(response.status).toBe(422);
      expect((await response.json()).error).toBe(code);
    }
  });

  test("maps upstream (LLM/Kakao) failures to 502 UPSTREAM_ERROR", async () => {
    const handler = createGenerateHandler({
      resolvePlaces: async () => {
        throw new UpstreamError("openrouter 429");
      },
    });
    const response = await handler(post({ text: TEXT }));
    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("UPSTREAM_ERROR");
  });
});
