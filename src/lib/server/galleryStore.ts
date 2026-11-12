import type { Spot } from "./buildCourse";
import { UpstreamError, type FetchFn } from "./llm";

/** 갤러리에 저장되는 공개 코스. ownerHash = sha256(anonymousId) — 원본 ID는 저장하지 않음 */
export type GalleryRecord = {
  id: string;
  ownerHash: string;
  title: string;
  intro: string;
  spots: Spot[];
  createdAt: string;
};

export interface GalleryStore {
  get(id: string): Promise<GalleryRecord | null>;
  put(record: GalleryRecord): Promise<void>;
  remove(id: string): Promise<void>;
  /** createdAt 내림차순 */
  listNewest(limit: number): Promise<GalleryRecord[]>;
}

const INDEX_KEY = "gallery:index";
const recordKey = (id: string) => `gallery:course:${id}`;

function parseRecord(raw: unknown): GalleryRecord | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as GalleryRecord;
  } catch {
    return null;
  }
}

/**
 * Upstash Redis REST API 클라이언트 (SDK 없이 fetch).
 * 레코드는 `gallery:course:{id}`에 JSON 문자열, 최신순 목록은 ZSET `gallery:index`(score=createdAt ms).
 */
export function createUpstashStore({
  url,
  token,
  fetchFn = fetch,
}: {
  url: string;
  token: string;
  fetchFn?: FetchFn;
}): GalleryStore {
  async function call(path: string, body: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await fetchFn(`${url.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      throw new UpstreamError(`upstash request failed: ${String(error)}`);
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new UpstreamError(`upstash responded ${response.status}`);
    }
    return data;
  }

  async function command(...args: string[]): Promise<unknown> {
    const data = (await call("", args)) as { result?: unknown; error?: string } | null;
    if (data?.error) throw new UpstreamError(`upstash error: ${data.error}`);
    return data?.result;
  }

  async function transaction(commands: string[][]): Promise<void> {
    const data = (await call("/multi-exec", commands)) as Array<{ error?: string }> | null;
    const failed = Array.isArray(data) ? data.find((r) => r?.error) : null;
    if (failed) throw new UpstreamError(`upstash error: ${failed.error}`);
  }

  return {
    async get(id) {
      return parseRecord(await command("GET", recordKey(id)));
    },
    async put(record) {
      await transaction([
        ["SET", recordKey(record.id), JSON.stringify(record)],
        ["ZADD", INDEX_KEY, String(Date.parse(record.createdAt)), record.id],
      ]);
    },
    async remove(id) {
      await transaction([
        ["DEL", recordKey(id)],
        ["ZREM", INDEX_KEY, id],
      ]);
    },
    async listNewest(limit) {
      const ids = (await command("ZRANGE", INDEX_KEY, "0", String(limit - 1), "REV")) as
        | string[]
        | null;
      if (!ids || ids.length === 0) return [];
      const raws = (await command("MGET", ...ids.map(recordKey))) as unknown[] | null;
      return (raws ?? []).map(parseRecord).filter((r): r is GalleryRecord => r !== null);
    },
  };
}

/** 테스트·로컬 개발용 (Upstash 환경변수가 없을 때). 프로세스 재시작 시 사라짐 */
export function createMemoryStore(): GalleryStore {
  const records = new Map<string, GalleryRecord>();
  return {
    async get(id) {
      return records.get(id) ?? null;
    },
    async put(record) {
      records.set(record.id, record);
    },
    async remove(id) {
      records.delete(id);
    },
    async listNewest(limit) {
      return [...records.values()]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, limit);
    },
  };
}
