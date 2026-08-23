import { describe, expect, test } from "vitest";
import { getLoadingPhaseText } from "./loadingPhase";

describe("getLoadingPhaseText", () => {
  test("shows the searching phase before the switch threshold", () => {
    expect(getLoadingPhaseText(0)).toBe("주변 장소 찾는 중");
    expect(getLoadingPhaseText(699)).toBe("주변 장소 찾는 중");
  });

  test("shows the building phase at and after the switch threshold", () => {
    expect(getLoadingPhaseText(700)).toBe("코스 만드는 중");
    expect(getLoadingPhaseText(5000)).toBe("코스 만드는 중");
  });
});
