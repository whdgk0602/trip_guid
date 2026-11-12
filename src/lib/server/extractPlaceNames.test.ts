import { describe, expect, test, vi } from "vitest";
import { extractWithFallback } from "./extractPlaceNames";
import { UpstreamError } from "./llm";

describe("extractWithFallback", () => {
  test("uses the primary (LLM) result when it succeeds, even if empty", async () => {
    const fallback = vi.fn(() => ["강남역"]);

    expect(await extractWithFallback("집에서 회사", async () => [], fallback)).toEqual([]);
    expect(fallback).not.toHaveBeenCalled();
  });

  test("falls back to the rule-based extractor when the LLM is unavailable", async () => {
    const result = await extractWithFallback(
      "대림역에서 강남역까지",
      async () => {
        throw new UpstreamError("all models failed — 429 free-models-per-day");
      },
      () => ["대림역", "강남역"],
    );

    expect(result).toEqual(["대림역", "강남역"]);
  });

  test("does not swallow unexpected (non-upstream) errors", async () => {
    await expect(
      extractWithFallback(
        "대림역에서 강남역까지",
        async () => {
          throw new TypeError("bug");
        },
        () => [],
      ),
    ).rejects.toBeInstanceOf(TypeError);
  });
});
