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

function errorResponse(status: number, message = "") {
  return new Response(JSON.stringify({ error: { message, code: status } }), { status });
}

const MSG = [{ role: "user" as const, content: "hi" }];
const bodyOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string);

describe("chatCompletion", () => {
  test("calls the first model with reasoning disabled and returns its content", async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse("안녕"));

    const result = await chatCompletion(MSG, {
      apiKey: "k",
      models: ["a:free", "b:free"],
      fetchFn,
    });

    expect(result).toBe("안녕");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer k");
    expect(bodyOf(fetchFn.mock.calls[0])).toMatchObject({
      model: "a:free",
      reasoning: { enabled: false },
    });
  });

  test("falls through to the next model on 429", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(429, "rate-limited upstream"))
      .mockResolvedValueOnce(okResponse("두번째"));

    const result = await chatCompletion(MSG, { apiKey: "k", models: ["a", "b"], fetchFn });

    expect(result).toBe("두번째");
    expect(bodyOf(fetchFn.mock.calls[1]).model).toBe("b");
  });

  test("falls through when a model returns empty content", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: null } }] })),
      )
      .mockResolvedValueOnce(okResponse("ok"));

    expect(await chatCompletion(MSG, { apiKey: "k", models: ["a", "b"], fetchFn })).toBe("ok");
  });

  test("retries the same model without the reasoning option when reasoning is mandatory", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        errorResponse(400, "Reasoning is mandatory for this endpoint and cannot be disabled."),
      )
      .mockResolvedValueOnce(okResponse("ernie"));

    const result = await chatCompletion(MSG, { apiKey: "k", models: ["ernie"], fetchFn });

    expect(result).toBe("ernie");
    expect(bodyOf(fetchFn.mock.calls[1]).model).toBe("ernie");
    expect(bodyOf(fetchFn.mock.calls[1]).reasoning).toBeUndefined();
  });

  test("throws UpstreamError when every model fails", async () => {
    const fetchFn = vi.fn().mockResolvedValue(errorResponse(429));

    await expect(
      chatCompletion(MSG, { apiKey: "k", models: ["a", "b"], fetchFn }),
    ).rejects.toBeInstanceOf(UpstreamError);
    expect(fetchFn).toHaveBeenCalledTimes(2);
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
