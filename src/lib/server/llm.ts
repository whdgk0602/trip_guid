const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
/** 모델 하나당 제한 시간 — 무료 모델은 가끔 수십 초씩 걸려서 끊고 다음 모델로 */
const PER_MODEL_TIMEOUT_MS = 8_000;
/**
 * 추론을 끌 수 없는 모델(ernie 등)은 답이 짧아도 추론에 1,000토큰 이상 쓴다.
 * 이 모델에 일반 max_tokens(300~800)를 주면 추론만 하다 빈 응답으로 끝나서 재시도 시 한도를 올린다.
 * (2026-11-13 측정: 코스 문구 1건에 추론 ~1,300토큰, 5.9초)
 */
const REASONING_MAX_TOKENS = 3_000;
/** 남은 예산이 이보다 적으면 다음 모델을 시도하지 않음 */
const MIN_ATTEMPT_MS = 1_000;

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
  /** 모델 하나당 제한 시간 */
  timeoutMs?: number;
  /**
   * 이 호출 전체(모든 모델 시도 합계)의 시간 예산. 넘으면 남은 모델을 건너뛰고 UpstreamError —
   * 호출 측 폴백(규칙 기반 추출·템플릿 문구)으로 넘어가 응답 시간을 묶어 둔다.
   */
  budgetMs?: number;
  /** 테스트용 시계 */
  now?: () => number;
};

type Attempt =
  | { ok: true; content: string }
  | { ok: false; reason: string; reasoningMandatory?: boolean };

async function tryModel(
  model: string,
  messages: ChatMessage[],
  disableReasoning: boolean,
  { apiKey, fetchFn = fetch, maxTokens = 300 }: ChatOptions,
  timeoutMs: number,
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
        max_tokens: disableReasoning ? maxTokens : Math.max(maxTokens, REASONING_MAX_TOKENS),
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
  const now = options.now ?? Date.now;
  const perModel = options.timeoutMs ?? PER_MODEL_TIMEOUT_MS;
  const deadline = options.budgetMs === undefined ? Infinity : now() + options.budgetMs;
  const timeoutFor = () => Math.min(perModel, deadline - now());

  const failures: string[] = [];
  for (const model of options.models) {
    if (timeoutFor() < MIN_ATTEMPT_MS) {
      failures.push(`${model}: skipped (time budget exhausted)`);
      continue;
    }
    let attempt = await tryModel(model, messages, true, options, timeoutFor());
    if (!attempt.ok && attempt.reasoningMandatory && timeoutFor() >= MIN_ATTEMPT_MS) {
      attempt = await tryModel(model, messages, false, options, timeoutFor());
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
