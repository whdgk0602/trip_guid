const STORAGE_KEY = "anonymousId";

type IdStorage = Pick<Storage, "getItem" | "setItem">;

export function getOrCreateAnonymousId(storage: IdStorage): string {
  const existing = storage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  storage.setItem(STORAGE_KEY, created);
  return created;
}
