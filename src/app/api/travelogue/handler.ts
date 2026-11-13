import { UpstreamError } from "@/lib/server/llm";
import { toTravelogueInput, type TravelogueInput } from "@/lib/server/travelogue";

export type TravelogueDeps = {
  generate: (input: TravelogueInput) => Promise<string>;
};

/**
 * POST /api/travelogue — { title, spots, checkins } → { travelogue }  (FR-12)
 * LLM이 안 되면 502를 돌려주고, 클라이언트가 템플릿 여행기로 대체한다.
 * 등급(프리미엄)은 브라우저에만 있어 서버에서 검증하지 않는다 (앱 전체의 화면 단위 게이팅과 동일).
 */
export function createTravelogueHandler({ generate }: TravelogueDeps) {
  return async function POST(request: Request): Promise<Response> {
    const input = toTravelogueInput(await request.json().catch(() => null));
    if (!input) {
      return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
    }
    try {
      return Response.json({ travelogue: await generate(input) });
    } catch (error) {
      console.error("[travelogue] failure", error);
      return Response.json(
        { error: "UPSTREAM_ERROR" },
        { status: error instanceof UpstreamError ? 502 : 500 },
      );
    }
  };
}
