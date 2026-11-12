import { describe, expect, test } from "vitest";
import { ruleBasedPlaceNames } from "./ruleBasedPlaceNames";

describe("ruleBasedPlaceNames", () => {
  test.each([
    ["출근길에 대림역에서 2호선 갈아타고 강남역에서 내려요", ["대림역", "강남역"]],
    ["퇴근하고 망원동에서 한강공원까지 걸어가요", ["망원동", "한강공원"]],
    ["점심 먹고 시청역에서 덕수궁 돌담길 따라 정동길 걸어요", ["시청역", "덕수궁", "돌담길", "정동길"]],
    ["주말에 연남동 경의선숲길 따라 홍대입구역까지 걸어요", ["연남동", "경의선숲길", "홍대입구역"]],
    ["성수동1가에서 서울숲으로 걸어가요", ["성수동1가", "서울숲"]],
    ["청계천 따라 광장시장까지, 그리고 남산타워!", ["청계천", "광장시장", "남산타워"]],
  ])("%s", (text, expected) => {
    expect(ruleBasedPlaceNames(text)).toEqual(expected);
  });

  test("ignores generic words like home, office, commute", () => {
    expect(ruleBasedPlaceNames("그냥 집에서 회사까지 걸어가는 길이에요")).toEqual([]);
    expect(ruleBasedPlaceNames("퇴근길에 운동하고 등산 가는 길")).toEqual([]);
  });

  test("dedupes and caps at 5", () => {
    expect(
      ruleBasedPlaceNames("가역 나역 다역 라역 마역 바역 가역").length,
    ).toBeLessThanOrEqual(5);
    expect(ruleBasedPlaceNames("강남역에서 강남역까지 왕복")).toEqual(["강남역"]);
  });
});
