import { describe, expect, test } from "vitest";
import { getGenerateErrorView, toGenerateErrorCode } from "./generateError";

describe("toGenerateErrorCode", () => {
  test("passes through known API codes", () => {
    expect(toGenerateErrorCode({ error: "PLACE_NOT_FOUND" })).toBe("PLACE_NOT_FOUND");
    expect(toGenerateErrorCode({ error: "GEOCODE_FAILED" })).toBe("GEOCODE_FAILED");
    expect(toGenerateErrorCode({ error: "INVALID_INPUT" })).toBe("INVALID_INPUT");
  });

  test("treats anything else as a retryable upstream error", () => {
    expect(toGenerateErrorCode({ error: "WHATEVER" })).toBe("UPSTREAM_ERROR");
    expect(toGenerateErrorCode(null)).toBe("UPSTREAM_ERROR");
  });
});

describe("getGenerateErrorView", () => {
  test("input problems ask for re-entry, not retry", () => {
    for (const code of ["PLACE_NOT_FOUND", "GEOCODE_FAILED", "INVALID_INPUT"] as const) {
      const view = getGenerateErrorView(code);
      expect(view.canRetry).toBe(false);
      expect(view.showExample).toBe(true);
    }
  });

  test("PLACE_NOT_FOUND uses the feature-spec wording", () => {
    expect(getGenerateErrorView("PLACE_NOT_FOUND").title).toBe(
      "장소를 인식하지 못했어요, 다시 입력해주세요",
    );
  });

  test("GEOCODE_FAILED mentions spelling", () => {
    expect(getGenerateErrorView("GEOCODE_FAILED").description).toContain("철자");
  });

  test("upstream errors offer retry", () => {
    expect(getGenerateErrorView("UPSTREAM_ERROR").canRetry).toBe(true);
  });
});
