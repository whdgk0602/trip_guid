export type GenerateErrorCode =
  | "INVALID_INPUT"
  | "PLACE_NOT_FOUND"
  | "GEOCODE_FAILED"
  | "UPSTREAM_ERROR";

const INPUT_ERRORS = ["INVALID_INPUT", "PLACE_NOT_FOUND", "GEOCODE_FAILED"];

/** API 에러 응답 본문 → 에러 코드. 모르는 형태는 재시도 가능한 서버 오류로 본다. */
export function toGenerateErrorCode(body: unknown): GenerateErrorCode {
  const code = (body as { error?: unknown } | null)?.error;
  return typeof code === "string" && INPUT_ERRORS.includes(code)
    ? (code as GenerateErrorCode)
    : "UPSTREAM_ERROR";
}

export type GenerateErrorView = {
  title: string;
  description: string;
  /** 같은 입력으로 다시 시도하면 나아질 수 있는가 (외부 API 장애) */
  canRetry: boolean;
  /** 입력 예시 문구를 다시 보여줄지 (feature-spec.md 5장) */
  showExample: boolean;
};

export const EXAMPLE_ROUTE_TEXT =
  "출근길에 대림역에서 2호선 갈아타고 강남역에서 내려요";

export function getGenerateErrorView(code: GenerateErrorCode): GenerateErrorView {
  switch (code) {
    case "PLACE_NOT_FOUND":
      return {
        title: "장소를 인식하지 못했어요, 다시 입력해주세요",
        description: "역 이름, 동네, 가게처럼 지도에서 찾을 수 있는 장소를 넣어주세요.",
        canRetry: false,
        showExample: true,
      };
    case "GEOCODE_FAILED":
      return {
        title: "장소 위치를 찾지 못했어요",
        description: "지명의 철자나 표기를 확인한 뒤 다시 입력해주세요.",
        canRetry: false,
        showExample: true,
      };
    case "INVALID_INPUT":
      return {
        title: "경로를 다시 입력해주세요",
        description: "10~300자로 입력해주세요.",
        canRetry: false,
        showExample: true,
      };
    case "UPSTREAM_ERROR":
      return {
        title: "코스를 만들지 못했어요",
        description: "잠시 연결이 불안정했어요. 다시 시도해주세요.",
        canRetry: true,
        showExample: false,
      };
  }
}
