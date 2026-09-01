export type Tier = "free" | "premium";

type TierStorage = Pick<Storage, "getItem" | "setItem">;

function tierKey(anonymousId: string): string {
  return `tier:${anonymousId}`;
}

export function getTier(
  storage: Pick<TierStorage, "getItem">,
  anonymousId: string,
): Tier {
  const stored = storage.getItem(tierKey(anonymousId));
  return stored === "premium" ? "premium" : "free";
}

export function setTier(
  storage: Pick<TierStorage, "setItem">,
  anonymousId: string,
  tier: Tier,
): void {
  storage.setItem(tierKey(anonymousId), tier);
}
