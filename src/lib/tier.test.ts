import { describe, expect, test } from "vitest";
import { getTier, setTier } from "./tier";

function createFakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("getTier", () => {
  test("returns 'free' when nothing is stored for this anonymousId", () => {
    const storage = createFakeStorage();

    expect(getTier(storage, "anon-1")).toBe("free");
  });

  test("returns the previously stored tier for this anonymousId", () => {
    const storage = createFakeStorage();
    setTier(storage, "anon-1", "premium");

    expect(getTier(storage, "anon-1")).toBe("premium");
  });

  test("keeps tiers separate per anonymousId", () => {
    const storage = createFakeStorage();
    setTier(storage, "anon-1", "premium");

    expect(getTier(storage, "anon-2")).toBe("free");
  });
});

describe("setTier", () => {
  test("overwrites a previously stored tier", () => {
    const storage = createFakeStorage();
    setTier(storage, "anon-1", "premium");
    setTier(storage, "anon-1", "free");

    expect(getTier(storage, "anon-1")).toBe("free");
  });
});
