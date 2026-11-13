import type { Checkin } from "./checkins";
import type { SavedRoute } from "./savedRoutes";

type FetchFn = typeof fetch;

/**
 * AI 여행기 요청 (POST /api/travelogue). 실패하면 null — 호출 측이 템플릿 여행기로 대체한다.
 */
export async function requestAiTravelogue(
  route: Pick<SavedRoute, "title" | "spots">,
  checkins: Checkin[],
  fetchFn: FetchFn = fetch,
): Promise<string | null> {
  try {
    const response = await fetchFn("/api/travelogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: route.title,
        spots: route.spots.map((s) => ({ id: s.id, name: s.name, category: s.category })),
        // 사진(data URL)은 보내지 않음 — 여행기는 텍스트 기록만으로 쓰고, 요청 크기도 작게
        checkins: checkins.map(({ spotId, note }) => ({ spotId, note })),
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { travelogue?: unknown };
    return typeof data.travelogue === "string" && data.travelogue.trim()
      ? data.travelogue
      : null;
  } catch {
    return null;
  }
}
