import { describe, expect, test, vi } from "vitest";
import { requestAiTravelogue } from "./travelogueClient";

const route = {
  title: "느린 오후",
  spots: [{ id: "a", name: "Uig", category: "카페", description: "d", address: "addr" }],
};
const checkins = [{ spotId: "a", note: "라떼가 따뜻했다" }];

describe("requestAiTravelogue", () => {
  test("sends only what the server needs and returns the travelogue", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ travelogue: "여행기" }), { status: 200 }));

    expect(await requestAiTravelogue(route, checkins, fetchFn)).toBe("여행기");

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("/api/travelogue");
    expect(JSON.parse(init.body)).toEqual({
      title: "느린 오후",
      spots: [{ id: "a", name: "Uig", category: "카페" }],
      checkins,
    });
  });

  test("never uploads check-in photos", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ travelogue: "t" }), { status: 200 }));

    await requestAiTravelogue(
      route,
      [{ spotId: "a", note: "n", photo: "data:image/jpeg;base64,AAAA" }],
      fetchFn,
    );

    expect(JSON.parse(fetchFn.mock.calls[0][1].body).checkins).toEqual([
      { spotId: "a", note: "n" },
    ]);
  });

  test("returns null on HTTP error, network error, or empty text", async () => {
    expect(
      await requestAiTravelogue(route, checkins, vi.fn().mockResolvedValue(new Response("{}", { status: 502 }))),
    ).toBeNull();
    expect(
      await requestAiTravelogue(route, checkins, vi.fn().mockRejectedValue(new TypeError("offline"))),
    ).toBeNull();
    expect(
      await requestAiTravelogue(
        route,
        checkins,
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ travelogue: " " }), { status: 200 })),
      ),
    ).toBeNull();
  });
});
