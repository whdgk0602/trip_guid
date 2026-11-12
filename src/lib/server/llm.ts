const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
/** 모델 하나당 제한 시간 — 무료 모델은 가끔 수십 초씩 걸려서 끊고 다음 모델로 */
const PER_MODEL_TIMEOUT_MS = 8_000;

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
  /** 시도할 모델 순서 — 앞 모델이 실패하면 다음 모델 */
  models: string[];
  fetchFn?: FetchFn;
  maxTokens?: number;
  timeoutMs?: number;
};

type Attempt =
  | { ok: true; content: string }
  | { ok: false; reason: string; reasoningMandatory?: boolean };

async function tryModel(
  model: string,
  messages: ChatMessage[],
  disableReasoning: boolean,
  { apiKey, fetchFn = fetch, maxTokens = 300, timeoutMs = PER_MODEL_TIMEOUT_MS }: ChatOptions,
): Promise<Attempt> {
  let response: Response;
  try {
    response = await fetchFn(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0,
        // 추론형 모델(nemotron 등)이 max_tokens를 사고 과정에 다 써서 content가 null로
        // 끝나는 문제 방지. 단, 추론을 끌 수 없는 모델(ernie 등)은 400 → 빼고 재시도
        ...(disableReasoning ? { reasoning: { enabled: false } } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return { ok: false, reason: `${model}: request failed (${String(error)})` };
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message: string = data?.error?.message ?? "";
    return {
      ok: false,
      reason: `${model}: ${response.status} ${message}`.trim(),
      reasoningMandatory: response.status === 400 && /reasoning is mandatory/i.test(message),
    };
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    return { ok: false, reason: `${model}: empty content` };
  }
  return { ok: true, content };
}

/**
 * OpenRouter 채팅 호출. 무료 모델은 429(공유 한도)·지연·빈 응답이 잦아서
 * OpenRouter 자체 폴백 대신 모델별로 직접 시도한다 — 모델마다 요청 옵션을 달리 줄 수 있게.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions,
): Promise<string> {
  const failures: string[] = [];
  for (const model of options.models) {
    let attempt = await tryModel(model, messages, true, options);
    if (!attempt.ok && attempt.reasoningMandatory) {
      attempt = await tryModel(model, messages, false, options);
    }
    if (attempt.ok) return attempt.content;
    failures.push(attempt.reason);
  }
  throw new UpstreamError(`all models failed — ${failures.join(" | ")}`);
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
