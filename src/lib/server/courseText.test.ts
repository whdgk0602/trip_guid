import { describe, expect, test, vi } from "vitest";
import type { Spot } from "./buildCourse";
import {
  buildCourseTextMessages,
  composeCourse,
  parseCourseText,
  writeCourseWithFallback,
} from "./courseText";
import type { GeoPlace } from "./kakao";
import { UpstreamError } from "./llm";

const places: GeoPlace[] = [
  { query: "망원동", name: "망원동", address: "", x: 126.9, y: 37.55 },
  { query: "망원한강공원", name: "망원한강공원", address: "", x: 126.89, y: 37.55 },
];

const spots: Spot[] = [
  { id: "a", name: "Uig", category: "카페", description: "망원동 근처의 카페.", address: "망원로3길 7" },
  { id: "b", name: "마포쌈지마당", category: "공원", description: "망원동 근처의 도시근린공원.", address: "방울내로 24-12" },
];

const goodJson = JSON.stringify({
  title: "강바람 따라 망원 산책",
  intro: "골목 카페에서 시작해 한강까지 이어지는 느긋한 퇴근길이에요.",
  spots: [
    { id: "a", description: "골목 안쪽에 숨은 아담한 카페에서 하루를 정리해요." },
    { id: "b", description: "잠시 벤치에 앉아 숨을 고르기 좋은 작은 쉼터." },
  ],
});

describe("buildCourseTextMessages", () => {
  test("includes route and spot facts and forbids invented details", () => {
    const [system, user] = buildCourseTextMessages(places, spots);

    expect(system.content).toMatch(/영업시간|가격|메뉴/);
    expect(user.content).toContain("망원동 → 망원한강공원");
    expect(user.content).toContain('"id":"a"');
    expect(user.content).toContain("Uig");
  });
});

describe("parseCourseText", () => {
  test("parses a valid response (even inside code fences)", () => {
    const result = parseCourseText("```json\n" + goodJson + "\n```", spots);

    expect(result?.title).toBe("강바람 따라 망원 산책");
    expect(result?.descriptions).toEqual({
      a: "골목 안쪽에 숨은 아담한 카페에서 하루를 정리해요.",
      b: "잠시 벤치에 앉아 숨을 고르기 좋은 작은 쉼터.",
    });
  });

  test("ignores descriptions for unknown spot ids", () => {
    const raw = JSON.stringify({
      title: "t",
      intro: "i",
      spots: [{ id: "zzz", description: "x" }],
    });
    expect(parseCourseText(raw, spots)?.descriptions).toEqual({});
  });

  test("returns null when title or intro is missing, empty or absurdly long", () => {
    expect(parseCourseText(JSON.stringify({ intro: "i", spots: [] }), spots)).toBeNull();
    expect(parseCourseText(JSON.stringify({ title: " ", intro: "i" }), spots)).toBeNull();
    expect(
      parseCourseText(JSON.stringify({ title: "가".repeat(60), intro: "i" }), spots),
    ).toBeNull();
    expect(parseCourseText("not json", spots)).toBeNull();
  });

  test("drops over-long spot descriptions (keeps the template instead)", () => {
    const raw = JSON.stringify({
      title: "t",
      intro: "i",
      spots: [{ id: "a", description: "가".repeat(200) }],
    });
    expect(parseCourseText(raw, spots)?.descriptions).toEqual({});
  });
});

describe("composeCourse", () => {
  test("uses generated text and keeps template descriptions for missing spots", () => {
    const course = composeCourse(places, spots, {
      title: "T",
      intro: "I",
      descriptions: { a: "생성된 설명" },
    });

    expect(course.title).toBe("T");
    expect(course.intro).toBe("I");
    expect(course.spots.map((s) => s.description)).toEqual([
      "생성된 설명",
      "망원동 근처의 도시근린공원.",
    ]);
  });

  test("falls back to the full template when nothing was generated", () => {
    const course = composeCourse(places, spots, null);
    expect(course.title).toBe("망원동에서 망원한강공원까지");
    expect(course.spots).toEqual(spots);
  });
});

describe("writeCourseWithFallback", () => {
  test("uses the LLM text when available", async () => {
    const course = await writeCourseWithFallback(places, spots, async () => ({
      title: "T",
      intro: "I",
      descriptions: {},
    }));
    expect(course.title).toBe("T");
  });

  test("uses the template when the LLM is unavailable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const course = await writeCourseWithFallback(places, spots, async () => {
      throw new UpstreamError("429");
    });
    expect(course.title).toBe("망원동에서 망원한강공원까지");
    warn.mockRestore();
  });

  test("does not swallow unexpected errors", async () => {
    await expect(
      writeCourseWithFallback(places, spots, async () => {
        throw new TypeError("bug");
      }),
    ).rejects.toBeInstanceOf(TypeError);
  });
});
