import { describe, expect, test } from "vitest";
import { signCourse } from "@/lib/server/courseSignature";
import { createMemoryStore, type GalleryStore } from "@/lib/server/galleryStore";
import { UpstreamError } from "@/lib/server/llm";
import { createGalleryHandlers } from "./handlers";

const ID = "11111111-1111-4111-8111-111111111111";
const OWNER = "22222222-2222-4222-8222-222222222222";
const course = {
  title: "강바람 산책",
  intro: "느긋한 퇴근길",
  spots: [{ id: "k1", name: "Uig", category: "카페", description: "설명", address: "망원로" }],
};

function req(method: string, body?: unknown) {
  return new Request(`http://localhost/api/gallery/${ID}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function setup(store: GalleryStore = createMemoryStore()) {
  return createGalleryHandlers({ getStore: () => store, getSecret: () => "s" });
}

const publishBody = {
  ownerId: OWNER,
  course,
  signature: signCourse(course, "s"),
  createdAt: "2026-11-13T00:00:00Z",
};

describe("gallery API", () => {
  test("publish → list → unpublish round trip", async () => {
    const api = setup();

    const put = await api.publish(req("PUT", publishBody), ID);
    expect(put.status).toBe(200);

    const list = await (await api.list()).json();
    expect(list.courses.map((c: { id: string }) => c.id)).toEqual([ID]);
    expect(JSON.stringify(list)).not.toContain(OWNER);

    const del = await api.unpublish(req("DELETE", { ownerId: OWNER }), ID);
    expect(del.status).toBe(204);
    expect((await (await api.list()).json()).courses).toEqual([]);
  });

  test("400 for malformed input, 403 for bad signature or wrong owner", async () => {
    const api = setup();

    expect((await api.publish(req("PUT", {}), ID)).status).toBe(400);
    expect(
      (await api.publish(req("PUT", { ...publishBody, signature: "00" }), ID)).status,
    ).toBe(403);

    await api.publish(req("PUT", publishBody), ID);
    const del = await api.unpublish(
      req("DELETE", { ownerId: "33333333-3333-4333-8333-333333333333" }),
      ID,
    );
    expect(del.status).toBe(403);
  });

  test("502 when the store is unavailable", async () => {
    const api = createGalleryHandlers({
      getStore: () => {
        throw new UpstreamError("not configured");
      },
      getSecret: () => "s",
    });
    const response = await api.list();
    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("UPSTREAM_ERROR");
  });
});
