import { isValidRouteInput } from "@/app/validateRouteInput";
import type { Spot } from "@/lib/server/buildCourse";
import type { Course } from "@/lib/server/courseText";
import type { GeoPlace } from "@/lib/server/kakao";
import { UpstreamError } from "@/lib/server/llm";
import { RouteResolveError } from "@/lib/server/resolveRoutePlaces";

export const FREE_SPOT_COUNT = 3;
export const PREMIUM_SPOT_COUNT = 5;

export type GenerateDeps = {
  resolvePlaces: (text: string) => Promise<GeoPlace[]>;
  buildSpots: (places: GeoPlace[], count: number) => Promise<Spot[]>;
  /** 제목·소개·스팟 설명 작성 (FR-4). LLM 실패 시 템플릿으로 채우므로 보통 throw하지 않음 */
  writeCourse: (places: GeoPlace[], spots: Spot[]) => Promise<Course>;
  /** 갤러리 게시용 서버 서명 (FR-8). 서명 키가 없으면 undefined — 생성은 계속 동작 */
  sign: (course: Course) => string | undefined;
};

export type GenerateErrorCode =
  | "INVALID_INPUT"
  | "PLACE_NOT_FOUND"
  | "GEOCODE_FAILED"
  | "NO_NEARBY_SPOTS"
  | "UPSTREAM_ERROR";

function errorResponse(code: GenerateErrorCode, status: number) {
  return Response.json({ error: code }, { status });
}

/**
 * POST /api/routes/generate
 * 경로 텍스트 → 지명 추출 + 지오코딩(FR-2) → 주변 장소 큐레이션(FR-3) → 코스 텍스트 생성(FR-4).
 */
export function createGenerateHandler({
  resolvePlaces,
  buildSpots,
  writeCourse,
  sign,
}: GenerateDeps) {
  return async function POST(request: Request): Promise<Response> {
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!isValidRouteInput(text)) {
      return errorResponse("INVALID_INPUT", 400);
    }
    const requestedSpotCount =
      body?.tier === "premium" ? PREMIUM_SPOT_COUNT : FREE_SPOT_COUNT;

    try {
      const places = await resolvePlaces(text);
      const spots = await buildSpots(places, requestedSpotCount);
      if (spots.length === 0) {
        return errorResponse("NO_NEARBY_SPOTS", 422);
      }

      const course = await writeCourse(places, spots);

      return Response.json({
        ...course,
        signature: sign(course),
        places,
        requestedSpotCount,
      });
    } catch (error) {
      if (error instanceof RouteResolveError) {
        return errorResponse(error.code, 422);
      }
      console.error("[generate] upstream failure", error);
      return errorResponse(
        "UPSTREAM_ERROR",
        error instanceof UpstreamError ? 502 : 500,
      );
    }
  };
}
