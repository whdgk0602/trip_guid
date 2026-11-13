import { parseModelList, UpstreamError } from "@/lib/server/llm";
import { generateTravelogue } from "@/lib/server/travelogue";
import { createTravelogueHandler } from "./handler";

/** 여행기는 출력이 코스 문구보다 길어 예산을 조금 넉넉히 (ernie 기준 수 초 예상) */
const TRAVELOGUE_BUDGET_MS = 12_000;

export const POST = createTravelogueHandler({
  generate: (input) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const models = parseModelList(process.env.OPENROUTER_MODEL);
    if (!apiKey || models.length === 0) {
      throw new UpstreamError("LLM is not configured");
    }
    return generateTravelogue(input, {
      apiKey,
      models,
      maxTokens: 700,
      timeoutMs: 10_000,
      budgetMs: TRAVELOGUE_BUDGET_MS,
    });
  },
});
