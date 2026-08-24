import { describe, expect, test } from "vitest";
import { buildShareFileName } from "./shareFileName";

describe("buildShareFileName", () => {
  test("replaces spaces with hyphens and appends .png", () => {
    expect(buildShareFileName("강남역 골목 산책")).toBe("강남역-골목-산책.png");
  });

  test("strips characters unsafe for filenames", () => {
    expect(buildShareFileName('제목: "특별한" 코스? / 산책*')).toBe(
      "제목-특별한-코스-산책.png",
    );
  });

  test("collapses repeated whitespace into a single hyphen", () => {
    expect(buildShareFileName("여러   공백   코스")).toBe(
      "여러-공백-코스.png",
    );
  });

  test("trims leading and trailing whitespace before converting", () => {
    expect(buildShareFileName("  앞뒤 공백  ")).toBe("앞뒤-공백.png");
  });

  test("falls back to a default name when the title becomes empty", () => {
    expect(buildShareFileName("")).toBe("동네-큐레이터-코스.png");
    expect(buildShareFileName("///???")).toBe("동네-큐레이터-코스.png");
  });
});
