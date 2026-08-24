import { describe, expect, test } from "vitest";
import { getOrCreateAnonymousId } from "./anonymousId";

function createFakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("getOrCreateAnonymousId", () => {
  test("returns the existing id when one is already stored", () => {
    const storage = createFakeStorage({ anonymousId: "existing-id" });

    expect(getOrCreateAnonymousId(storage)).toBe("existing-id");
  });

  test("creates and persists a new id when none is stored", () => {
    const storage = createFakeStorage();

    const id = getOrCreateAnonymousId(storage);

    expect(id).toBeTruthy();
    expect(storage.getItem("anonymousId")).toBe(id);
  });
});
