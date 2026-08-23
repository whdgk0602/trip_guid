import { describe, expect, test } from "vitest";
import { isValidRouteInput } from "./validateRouteInput";

describe("isValidRouteInput", () => {
  test("rejects text shorter than 10 characters", () => {
    expect(isValidRouteInput("short")).toBe(false);
  });

  test("rejects text longer than 300 characters", () => {
    expect(isValidRouteInput("a".repeat(301))).toBe(false);
  });

  test("accepts text between 10 and 300 characters", () => {
    expect(isValidRouteInput("a".repeat(10))).toBe(true);
  });
});
