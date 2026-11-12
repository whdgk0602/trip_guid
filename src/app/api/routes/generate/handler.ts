import { isValidRouteInput } from "@/app/validateRouteInput";
import type { GeoPlace } from "@/lib/server/kakao";
import { UpstreamError } from "@/lib/server/llm";
import { RouteResolveError } from "@/lib/server/resolveRoutePlaces";
import { MOCK_INTRO, MOCK_TITLE, spotsForTier } from "./mockCourse";

export type GenerateDeps = {
  resolvePlaces: (text: string) => Promise<GeoPlace[]>;
};

export type GenerateErrorCode =
  | "INVALID_INPUT"
  | "PLACE_NOT_FOUND"
  | "GEOCODE_FAILED"
  | "UPSTREAM_ERROR";

function errorResponse(code: GenerateErrorCode, status: number) {
  return Response.json({ error: code }, { status });
}

/**
 * POST /api/routes/generate
 * 경로 텍스트 → 지명 추출 + 지오코딩(FR-2, 실제 API) → 코스.
 * 스팟/제목/소개는 아직 목업 (FR-3·FR-4는 다음 단계에서 교체).
 */
export function createGenerateHandler({ resolvePlaces }: GenerateDeps) {
  return async function POST(request: Request): Promise<Response> {
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!isValidRouteInput(text)) {
      return errorResponse("INVALID_INPUT", 400);
    }
    const isPremium = body?.tier === "premium";

    let places: GeoPlace[];
    try {
      places = await resolvePlaces(text);
    } catch (error) {
      if (error instanceof RouteResolveError) {
        return errorResponse(error.code, 422);
      }
      console.error("[generate] upstream failure", error);
      if (error instanceof UpstreamError) {
        return errorResponse("UPSTREAM_ERROR", 502);
      }
      return errorResponse("UPSTREAM_ERROR", 500);
    }

    return Response.json({
      title: MOCK_TITLE,
      intro: MOCK_INTRO,
      spots: spotsForTier(isPremium),
      places,
    });
  };
}
