const PHASE_SWITCH_MS = 700;

export function getLoadingPhaseText(elapsedMs: number): string {
  if (elapsedMs < PHASE_SWITCH_MS) {
    return "주변 장소 찾는 중";
  }
  return "코스 만드는 중";
}
