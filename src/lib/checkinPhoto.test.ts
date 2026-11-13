import { describe, expect, test } from "vitest";
import { fitWithin } from "./checkinPhoto";

describe("fitWithin", () => {
  test("scales the longest side down to the limit, keeping the ratio", () => {
    expect(fitWithin(4032, 3024, 640)).toEqual({ width: 640, height: 480 });
    expect(fitWithin(3024, 4032, 640)).toEqual({ width: 480, height: 640 });
  });

  test("leaves small images untouched", () => {
    expect(fitWithin(500, 300, 640)).toEqual({ width: 500, height: 300 });
  });

  test("never collapses a side to zero", () => {
    expect(fitWithin(10000, 2, 640)).toEqual({ width: 640, height: 1 });
  });
});
