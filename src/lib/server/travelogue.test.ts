import { describe, expect, test } from "vitest";
import {
  buildTravelogueMessages,
  parseTravelogue,
  toTravelogueInput,
} from "./travelogue";

const body = {
  title: "느린 오후, 망원에서 강까지",
  spots: [
    { id: "a", name: "Uig", category: "카페" },
    { id: "b", name: "망원한강공원", category: "공원" },
  ],
  checkins: [
    { spotId: "b", note: "  노을이 생각보다 길었다 " },
    { spotId: "a", note: "라떼가 따뜻해서 손이 녹았다" },
  ],
};

const LONG = "카페에서 따뜻한 라떼로 손을 녹이고 걷기 시작했다. 한강에 닿았을 때 노을이 생각보다 길었다.";

describe("toTravelogueInput", () => {
  test("pairs notes with spots in course order and trims them", () => {
    expect(toTravelogueInput(body)).toEqual({
      title: "느린 오후, 망원에서 강까지",
      stops: [
        { name: "Uig", category: "카페", note: "라떼가 따뜻해서 손이 녹았다" },
        { name: "망원한강공원", category: "공원", note: "노을이 생각보다 길었다" },
      ],
    });
  });

  test("requires every spot to be checked in", () => {
    expect(toTravelogueInput({ ...body, checkins: body.checkins.slice(0, 1) })).toBeNull();
  });

  test("rejects malformed or oversized input", () => {
    expect(toTravelogueInput(null)).toBeNull();
    expect(toTravelogueInput({ ...body, title: "" })).toBeNull();
    expect(toTravelogueInput({ ...body, spots: [] })).toBeNull();
    expect(
      toTravelogueInput({
        ...body,
        checkins: [
          { spotId: "a", note: "가".repeat(201) },
          { spotId: "b", note: "ok" },
        ],
      }),
    ).toBeNull();
  });
});

describe("buildTravelogueMessages", () => {
  test("lists stops in order with the user's notes quoted", () => {
    const [system, user] = buildTravelogueMessages(toTravelogueInput(body)!);

    expect(system.content).toMatch(/지어내지 않는다/);
    expect(user.content).toContain("코스: 느린 오후, 망원에서 강까지");
    expect(user.content).toContain('1. Uig (카페): "라떼가 따뜻해서 손이 녹았다"');
    expect(user.content).toContain('2. 망원한강공원 (공원): "노을이 생각보다 길었다"');
  });
});

describe("parseTravelogue", () => {
  test("reads the JSON field (also inside code fences)", () => {
    expect(parseTravelogue(JSON.stringify({ travelogue: LONG }))).toBe(LONG);
    expect(parseTravelogue("```json\n" + JSON.stringify({ travelogue: LONG }) + "\n```")).toBe(LONG);
  });

  test("accepts a plain paragraph without JSON", () => {
    expect(parseTravelogue(`\n${LONG}\n`)).toBe(LONG);
  });

  test("rejects too short, too long, or broken JSON", () => {
    expect(parseTravelogue(JSON.stringify({ travelogue: "짧다" }))).toBeNull();
    expect(parseTravelogue(JSON.stringify({ travelogue: "가".repeat(801) }))).toBeNull();
    expect(parseTravelogue('{"travelogue": ')).toBeNull();
  });
});
