import { describe, expect, test, vi } from "vitest";
import { chatCompletion, parseJsonFromLlm, UpstreamError } from "./llm";

describe("parseJsonFromLlm", () => {
  test("parses plain JSON", () => {
    expect(parseJsonFromLlm('["강남역", "역삼역"]')).toEqual(["강남역", "역삼역"]);
  });

  test("strips ```json code fences", () => {
    expect(parseJsonFromLlm('```json\n["강남역"]\n```')).toEqual(["강남역"]);
  });

  test("extracts JSON surrounded by prose", () => {
    expect(parseJsonFromLlm('결과입니다: {"places": ["선릉"]} 끝')).toEqual({
      places: ["선릉"],
    });
  });

  test("returns null for unparseable text", () => {
    expect(parseJsonFromLlm("지명이 없습니다")).toBeNull();
  });
});

function okResponse(content: string) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status: 200 },
  );
}

describe("chatCompletion", () => {
  test("sends the model fallback list and returns the message content", async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse("안녕"));

    const result = await chatCompletion([{ role: "user", content: "hi" }], {
      apiKey: "k",
      models: ["a:free", "b:free"],
      fetchFn,
    });

    expect(result).toBe("안녕");
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer k");
    expect(JSON.parse(init.body).models).toEqual(["a:free", "b:free"]);
    expect(JSON.parse(init.body).reasoning).toEqual({ enabled: false });
  });

  test("throws UpstreamError on non-2xx (e.g. 429 rate limit)", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 429 }));

    await expect(
      chatCompletion([{ role: "user", content: "hi" }], {
        apiKey: "k",
        models: ["a:free"],
        fetchFn,
      }),
    ).rejects.toBeInstanceOf(UpstreamError);
  });

  test("throws UpstreamError when the network call fails", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      chatCompletion([{ role: "user", content: "hi" }], {
        apiKey: "k",
        models: ["a:free"],
        fetchFn,
      }),
    ).rejects.toBeInstanceOf(UpstreamError);
  });
});
