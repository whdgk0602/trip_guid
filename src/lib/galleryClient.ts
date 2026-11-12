import type { SavedRoute } from "./savedRoutes";

/** 서버 갤러리의 공개 코스 (GET /api/gallery) */
export type PublicCourse = Pick<SavedRoute, "id" | "title" | "intro" | "spots" | "createdAt">;

type FetchFn = typeof fetch;

/**
 * 서버 갤러리에 올릴 수 있는 코스: 공개 + 생성 API 서명 있음.
 * 서명 기능 이전에 저장된 코스는 서명이 없어 이 브라우저에만 남는다.
 */
export function routesToPublish(routes: SavedRoute[]): SavedRoute[] {
  return routes.filter((r) => r.visibility === "public" && typeof r.signature === "string");
}

/** 공개 게시 (같은 코스를 다시 보내도 안전). 성공 여부만 반환 — 실패해도 로컬 저장은 유지 */
export async function publishToGallery(
  route: SavedRoute,
  ownerId: string,
  fetchFn: FetchFn = fetch,
): Promise<boolean> {
  if (!route.signature) return false;
  try {
    const response = await fetchFn(`/api/gallery/${route.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerId,
        course: { title: route.title, intro: route.intro, spots: route.spots },
        signature: route.signature,
        createdAt: route.createdAt,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function unpublishFromGallery(
  id: string,
  ownerId: string,
  fetchFn: FetchFn = fetch,
): Promise<boolean> {
  try {
    const response = await fetchFn(`/api/gallery/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** 공개 코스 다시 게시 — 예전에 게시가 실패했던 코스도 마이페이지 방문 시 올라가게 */
export async function syncPublicRoutes(
  routes: SavedRoute[],
  ownerId: string,
  fetchFn: FetchFn = fetch,
): Promise<void> {
  await Promise.all(routesToPublish(routes).map((r) => publishToGallery(r, ownerId, fetchFn)));
}

export async function fetchGallery(fetchFn: FetchFn = fetch): Promise<PublicCourse[]> {
  const response = await fetchFn("/api/gallery");
  if (!response.ok) throw new Error(`gallery responded ${response.status}`);
  const data = (await response.json()) as { courses?: PublicCourse[] };
  return data.courses ?? [];
}
