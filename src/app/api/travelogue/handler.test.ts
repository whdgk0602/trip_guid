import { describe, expect, test, vi } from "vitest";
import { UpstreamError } from "@/lib/server/llm";
import { createTravelogueHandler } from "./handler";

const body = {
  title: "느린 오후",
  spots: [{ id: "a", name: "Uig", category: "카페" }],
  checkins: [{ spotId: "a", note: "라떼가 따뜻했다" }],
};

function post(payload: unknown) {
  return new Request("http://localhost/api/travelogue", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

describe("POST /api/travelogue", () => {
  test("returns the generated travelogue", async () => {
    const generate = vi.fn(async () => "따뜻한 라떼로 시작한 오후였다.");
    const response = await createTravelogueHandler({ generate })(post(body));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ travelogue: "따뜻한 라떼로 시작한 오후였다." });
    expect(generate).toHaveBeenCalledWith({
      title: "느린 오후",
      stops: [{ name: "Uig", category: "카페", note: "라떼가 따뜻했다" }],
    });
  });

  test("400 when the course is not fully checked in", async () => {
    const generate = vi.fn();
    const response = await createTravelogueHandler({ generate })(
      post({ ...body, checkins: [] }),
    );
    expect(response.status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });

  test("502 when the LLM is unavailable", async () => {
    const response = await createTravelogueHandler({
      generate: async () => {
        throw new UpstreamError("429");
      },
    })(post(body));
    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("UPSTREAM_ERROR");
  });
});
