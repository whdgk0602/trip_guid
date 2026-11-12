import { describe, expect, test } from "vitest";
import { signCourse, verifyCourse } from "./courseSignature";

const course = {
  title: "강바람 산책",
  intro: "느긋한 퇴근길",
  spots: [{ id: "1", name: "Uig", category: "카페", description: "설명", address: "망원로" }],
};

describe("course signature", () => {
  test("verifies a course signed with the same secret", () => {
    expect(verifyCourse(course, signCourse(course, "s"), "s")).toBe(true);
  });

  test("rejects tampered content", () => {
    const sig = signCourse(course, "s");
    expect(verifyCourse({ ...course, title: "광고 문구" }, sig, "s")).toBe(false);
    expect(
      verifyCourse(
        { ...course, spots: [{ ...course.spots[0], description: "바뀜" }] },
        sig,
        "s",
      ),
    ).toBe(false);
  });

  test("rejects a different secret or a malformed signature", () => {
    const sig = signCourse(course, "s");
    expect(verifyCourse(course, sig, "other")).toBe(false);
    expect(verifyCourse(course, "zz", "s")).toBe(false);
    expect(verifyCourse(course, "", "s")).toBe(false);
  });

  test("ignores extra fields on spots (only schema fields are signed)", () => {
    const sig = signCourse(course, "s");
    const withExtra = {
      ...course,
      spots: [{ ...course.spots[0], extra: "x" } as (typeof course.spots)[0]],
    };
    expect(verifyCourse(withExtra, sig, "s")).toBe(true);
  });
});
