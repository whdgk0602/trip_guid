const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 20_000;

export type FetchFn = typeof fetch;

/** 외부 API(LLM·카카오) 장애 — 사용자 입력 문제가 아니라 재시도 대상 */
export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

export type ChatMessage = { role: "system" | "user"; content: string };

export type ChatOptions = {
  apiKey: string;
  /** OpenRouter `models` 폴백 목록 — 앞 모델이 실패하면 다음 모델로 자동 전환 */
  models: string[];
  fetchFn?: FetchFn;
  maxTokens?: number;
};

export async function chatCompletion(
  messages: ChatMessage[],
  { apiKey, models, fetchFn = fetch, maxTokens = 300 }: ChatOptions,
): Promise<string> {
  let response: Response;
  try {
    response = await fetchFn(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        models,
        messages,
        max_tokens: maxTokens,
        temperature: 0,
        // 폴백 목록의 추론형 모델(nemotron 등)이 max_tokens를 사고 과정에 다 써서
        // content가 null로 끝나는 문제 방지 — 단순 추출/생성이라 추론 불필요
        reasoning: { enabled: false },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new UpstreamError(`openrouter request failed: ${String(error)}`);
  }

  if (!response.ok) {
    throw new UpstreamError(`openrouter responded ${response.status}`);
  }

  const data = await response.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new UpstreamError("openrouter returned no message content");
  }
  return content;
}

/**
 * LLM 응답에서 JSON을 꺼낸다. 무료 모델은 ```json 코드펜스나 앞뒤 설명을
 * 붙이는 경우가 있어서, 펜스를 벗기고 첫 `[`/`{`부터 마지막 `]`/`}`까지를 파싱한다.
 */
export function parseJsonFromLlm(text: string): unknown {
  const unfenced = text.replace(/```(?:json)?/gi, "").trim();
  const start = unfenced.search(/[[{]/);
  const end = Math.max(unfenced.lastIndexOf("]"), unfenced.lastIndexOf("}"));
  if (start === -1 || end < start) return null;
  try {
    return JSON.parse(unfenced.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** `OPENROUTER_MODEL`(쉼표 구분 목록)을 배열로 */
export function parseModelList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}
