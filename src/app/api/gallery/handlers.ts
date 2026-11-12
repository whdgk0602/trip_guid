import {
  GalleryError,
  listGallery,
  publishCourse,
  unpublishCourse,
} from "@/lib/server/gallery";
import type { GalleryStore } from "@/lib/server/galleryStore";
import { UpstreamError } from "@/lib/server/llm";

export type GalleryDeps = {
  getStore: () => GalleryStore;
  getSecret: () => string;
};

function errorResponse(error: unknown): Response {
  if (error instanceof GalleryError) {
    const status = error.code === "INVALID" ? 400 : 403;
    return Response.json({ error: error.code }, { status });
  }
  console.error("[gallery] failure", error);
  return Response.json(
    { error: "UPSTREAM_ERROR" },
    { status: error instanceof UpstreamError ? 502 : 500 },
  );
}

/** 갤러리 API 핸들러 (FR-8). 저장소·서명 키를 주입받아 테스트 가능하게 */
export function createGalleryHandlers({ getStore, getSecret }: GalleryDeps) {
  return {
    /** GET /api/gallery — 공개 코스 최신순 */
    async list(): Promise<Response> {
      try {
        return Response.json({ courses: await listGallery(getStore()) });
      } catch (error) {
        return errorResponse(error);
      }
    },

    /** PUT /api/gallery/[id] — { ownerId, course, signature, createdAt } */
    async publish(request: Request, id: string): Promise<Response> {
      const body = await request.json().catch(() => null);
      try {
        const course = await publishCourse(
          getStore(),
          {
            id,
            ownerId: body?.ownerId,
            course: body?.course,
            signature: body?.signature,
            createdAt: body?.createdAt,
          },
          getSecret(),
        );
        return Response.json({ course });
      } catch (error) {
        return errorResponse(error);
      }
    },

    /** DELETE /api/gallery/[id] — { ownerId } */
    async unpublish(request: Request, id: string): Promise<Response> {
      const body = await request.json().catch(() => null);
      try {
        await unpublishCourse(getStore(), id, body?.ownerId);
        return new Response(null, { status: 204 });
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
