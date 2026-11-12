import { describe, expect, test, vi } from "vitest";
import { createMemoryStore, createUpstashStore, type GalleryRecord } from "./galleryStore";
import { UpstreamError } from "./llm";

function record(id: string, createdAt: string): GalleryRecord {
  return { id, ownerHash: "h", title: `t${id}`, intro: "i", spots: [], createdAt };
}

describe("createMemoryStore", () => {
  test("lists newest first and respects the limit", async () => {
    const store = createMemoryStore();
    await store.put(record("old", "2026-01-01T00:00:00Z"));
    await store.put(record("new", "2026-03-01T00:00:00Z"));
    await store.put(record("mid", "2026-02-01T00:00:00Z"));

    expect((await store.listNewest(2)).map((r) => r.id)).toEqual(["new", "mid"]);
  });

  test("remove deletes the record", async () => {
    const store = createMemoryStore();
    await store.put(record("a", "2026-01-01T00:00:00Z"));
    await store.remove("a");
    expect(await store.get("a")).toBeNull();
  });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status });
}

describe("createUpstashStore", () => {
  test("put writes the record and the index in one transaction", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json([{ result: "OK" }, { result: 1 }]));
    const store = createUpstashStore({ url: "https://u.upstash.io/", token: "t", fetchFn });

    await store.put(record("a", "2026-01-01T00:00:00Z"));

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://u.upstash.io/multi-exec");
    expect(init.headers.Authorization).toBe("Bearer t");
    const commands = JSON.parse(init.body);
    expect(commands[0].slice(0, 2)).toEqual(["SET", "gallery:course:a"]);
    expect(commands[1]).toEqual([
      "ZADD",
      "gallery:index",
      String(Date.parse("2026-01-01T00:00:00Z")),
      "a",
    ]);
  });

  test("listNewest reads ids from the index (REV) then MGETs records", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json({ result: ["b", "a"] }))
      .mockResolvedValueOnce(
        json({
          result: [
            JSON.stringify(record("b", "2026-02-01T00:00:00Z")),
            null,
          ],
        }),
      );
    const store = createUpstashStore({ url: "https://u", token: "t", fetchFn });

    const list = await store.listNewest(20);

    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual([
      "ZRANGE",
      "gallery:index",
      "0",
      "19",
      "REV",
    ]);
    expect(JSON.parse(fetchFn.mock.calls[1][1].body)).toEqual([
      "MGET",
      "gallery:course:b",
      "gallery:course:a",
    ]);
    expect(list.map((r) => r.id)).toEqual(["b"]);
  });

  test("returns [] without MGET when the index is empty", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json({ result: [] }));
    const store = createUpstashStore({ url: "https://u", token: "t", fetchFn });

    expect(await store.listNewest(20)).toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("throws UpstreamError on HTTP or command errors", async () => {
    const http = createUpstashStore({
      url: "https://u",
      token: "t",
      fetchFn: vi.fn().mockResolvedValue(json({}, 401)),
    });
    await expect(http.get("a")).rejects.toBeInstanceOf(UpstreamError);

    const cmd = createUpstashStore({
      url: "https://u",
      token: "t",
      fetchFn: vi.fn().mockResolvedValue(json({ error: "WRONGTYPE" })),
    });
    await expect(cmd.get("a")).rejects.toBeInstanceOf(UpstreamError);
  });
});
