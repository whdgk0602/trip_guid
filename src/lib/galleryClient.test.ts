import { describe, expect, test, vi } from "vitest";
import {
  fetchGallery,
  publishToGallery,
  routesToPublish,
  syncPublicRoutes,
  unpublishFromGallery,
} from "./galleryClient";
import type { SavedRoute } from "./savedRoutes";

function route(overrides: Partial<SavedRoute> = {}): SavedRoute {
  return {
    id: "r1",
    title: "t",
    intro: "i",
    spots: [],
    visibility: "public",
    createdAt: "2026-11-13T00:00:00Z",
    signature: "sig",
    ...overrides,
  };
}

describe("routesToPublish", () => {
  test("keeps only public routes that carry a server signature", () => {
    const result = routesToPublish([
      route({ id: "a" }),
      route({ id: "b", visibility: "private" }),
      route({ id: "c", signature: undefined }),
    ]);
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("publishToGallery", () => {
  test("PUTs the course, signature and owner", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    expect(await publishToGallery(route(), "owner", fetchFn)).toBe(true);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("/api/gallery/r1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({
      ownerId: "owner",
      course: { title: "t", intro: "i", spots: [] },
      signature: "sig",
      createdAt: "2026-11-13T00:00:00Z",
    });
  });

  test("does not call the API for unsigned routes and reports network failure as false", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("offline"));
    expect(await publishToGallery(route({ signature: undefined }), "o", fetchFn)).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(await publishToGallery(route(), "o", fetchFn)).toBe(false);
  });
});

describe("unpublishFromGallery", () => {
  test("DELETEs with the owner id", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    expect(await unpublishFromGallery("r1", "owner", fetchFn)).toBe(true);
    expect(fetchFn.mock.calls[0][1].method).toBe("DELETE");
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual({ ownerId: "owner" });
  });
});

describe("syncPublicRoutes", () => {
  test("publishes every eligible route", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await syncPublicRoutes(
      [route({ id: "a" }), route({ id: "b" }), route({ id: "c", visibility: "private" })],
      "o",
      fetchFn,
    );
    expect(fetchFn.mock.calls.map((c) => c[0])).toEqual(["/api/gallery/a", "/api/gallery/b"]);
  });
});

describe("fetchGallery", () => {
  test("returns courses, throws on HTTP error", async () => {
    const ok = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ courses: [{ id: "x" }] }), { status: 200 }),
    );
    expect(await fetchGallery(ok)).toEqual([{ id: "x" }]);

    const bad = vi.fn().mockResolvedValue(new Response("{}", { status: 502 }));
    await expect(fetchGallery(bad)).rejects.toThrow();
  });
});
