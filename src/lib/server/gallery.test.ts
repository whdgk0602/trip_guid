import { describe, expect, test } from "vitest";
import { signCourse } from "./courseSignature";
import { hashOwner, listGallery, publishCourse, unpublishCourse } from "./gallery";
import { createMemoryStore } from "./galleryStore";

const SECRET = "secret";
const ID = "11111111-1111-4111-8111-111111111111";
const OWNER = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const NOW = new Date("2026-11-13T12:00:00Z");

const course = {
  title: "강바람 산책",
  intro: "느긋한 퇴근길",
  spots: [{ id: "k1", name: "Uig", category: "카페", description: "설명", address: "망원로" }],
};

function input(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    ownerId: OWNER,
    course,
    signature: signCourse(course, SECRET),
    createdAt: "2026-11-13T11:00:00Z",
    ...overrides,
  };
}

describe("publishCourse", () => {
  test("stores a signed course and hides the owner in the public view", async () => {
    const store = createMemoryStore();

    const published = await publishCourse(store, input(), SECRET, NOW);

    expect(published).toEqual({ id: ID, ...course, createdAt: "2026-11-13T11:00:00.000Z" });
    expect((await store.get(ID))?.ownerHash).toBe(hashOwner(OWNER));
    expect(JSON.stringify(published)).not.toContain(OWNER);
  });

  test("rejects content that was not signed by the server", async () => {
    const store = createMemoryStore();
    await expect(
      publishCourse(store, input({ course: { ...course, title: "광고" } }), SECRET, NOW),
    ).rejects.toMatchObject({ code: "BAD_SIGNATURE" });
    expect(await store.get(ID)).toBeNull();
  });

  test("rejects malformed input", async () => {
    const store = createMemoryStore();
    for (const bad of [
      { id: "not-a-uuid" },
      { ownerId: "x" },
      { course: { ...course, spots: [] } },
      { course: { ...course, title: "가".repeat(61) } },
      { signature: 123 },
    ]) {
      await expect(publishCourse(store, input(bad), SECRET, NOW)).rejects.toMatchObject({
        code: "INVALID",
      });
    }
  });

  test("is idempotent for the same owner and keeps the original createdAt", async () => {
    const store = createMemoryStore();
    await publishCourse(store, input(), SECRET, NOW);
    const again = await publishCourse(
      store,
      input({ createdAt: "2026-11-13T11:30:00Z" }),
      SECRET,
      NOW,
    );
    expect(again.createdAt).toBe("2026-11-13T11:00:00.000Z");
  });

  test("refuses to overwrite someone else's course", async () => {
    const store = createMemoryStore();
    await publishCourse(store, input(), SECRET, NOW);
    await expect(
      publishCourse(store, input({ ownerId: OTHER }), SECRET, NOW),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("clamps a future createdAt to now", async () => {
    const store = createMemoryStore();
    const published = await publishCourse(
      store,
      input({ createdAt: "2099-01-01T00:00:00Z" }),
      SECRET,
      NOW,
    );
    expect(published.createdAt).toBe(NOW.toISOString());
  });
});

describe("unpublishCourse", () => {
  test("only the owner can remove", async () => {
    const store = createMemoryStore();
    await publishCourse(store, input(), SECRET, NOW);

    await expect(unpublishCourse(store, ID, OTHER)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await unpublishCourse(store, ID, OWNER);
    expect(await store.get(ID)).toBeNull();
  });

  test("treats a missing course as already unpublished", async () => {
    await expect(unpublishCourse(createMemoryStore(), ID, OWNER)).resolves.toBeUndefined();
  });
});

describe("listGallery", () => {
  test("returns public views without owner hashes", async () => {
    const store = createMemoryStore();
    await publishCourse(store, input(), SECRET, NOW);
    const [item] = await listGallery(store);
    expect(item).not.toHaveProperty("ownerHash");
  });
});
