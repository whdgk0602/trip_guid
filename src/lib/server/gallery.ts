import { createHash } from "node:crypto";
import type { Spot } from "./buildCourse";
import { verifyCourse } from "./courseSignature";
import type { GalleryRecord, GalleryStore } from "./galleryStore";

export const GALLERY_PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SPOTS = 5;
const MAX_FIELD = 300;

export type GalleryErrorCode = "INVALID" | "BAD_SIGNATURE" | "FORBIDDEN";

export class GalleryError extends Error {
  constructor(public readonly code: GalleryErrorCode) {
    super(code);
    this.name = "GalleryError";
  }
}

/** 갤러리 응답에 나가는 형태 — 소유자 정보 없음 */
export type PublicCourse = Omit<GalleryRecord, "ownerHash">;

export function hashOwner(ownerId: string): string {
  return createHash("sha256").update(`dailyroute:${ownerId}`).digest("hex");
}

function isText(value: unknown, max = MAX_FIELD): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function toSpots(value: unknown): Spot[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SPOTS) return null;
  const spots: Spot[] = [];
  for (const s of value as Record<string, unknown>[]) {
    if (
      !isText(s?.id, 64) ||
      !isText(s?.name) ||
      !isText(s?.category, 40) ||
      !isText(s?.description) ||
      typeof s?.address !== "string" ||
      s.address.length > MAX_FIELD
    ) {
      return null;
    }
    spots.push({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      address: s.address,
    });
  }
  return spots;
}

export type PublishInput = {
  id: unknown;
  ownerId: unknown;
  course: unknown;
  signature: unknown;
  createdAt: unknown;
};

/**
 * 공개 코스 게시 (같은 id로 다시 보내도 결과가 같음 — 마이페이지 동기화에 사용).
 * - 생성 API 서명이 맞아야 함 (위조 콘텐츠 차단)
 * - 이미 다른 사람이 같은 id로 올렸다면 거부
 */
export async function publishCourse(
  store: GalleryStore,
  input: PublishInput,
  secret: string,
  now: Date = new Date(),
): Promise<PublicCourse> {
  const course = input.course as Record<string, unknown> | null;
  const spots = toSpots(course?.spots);
  if (
    typeof input.id !== "string" ||
    !UUID.test(input.id) ||
    typeof input.ownerId !== "string" ||
    !UUID.test(input.ownerId) ||
    !isText(course?.title, 60) ||
    !isText(course?.intro) ||
    !spots ||
    typeof input.signature !== "string"
  ) {
    throw new GalleryError("INVALID");
  }

  const title = course.title as string;
  const intro = course.intro as string;
  if (!verifyCourse({ title, intro, spots }, input.signature, secret)) {
    throw new GalleryError("BAD_SIGNATURE");
  }

  const ownerHash = hashOwner(input.ownerId);
  const existing = await store.get(input.id);
  if (existing && existing.ownerHash !== ownerHash) {
    throw new GalleryError("FORBIDDEN");
  }

  // 클라이언트가 보낸 저장 시각은 미래만 아니면 신뢰 (최신순 정렬 기준)
  const claimed = typeof input.createdAt === "string" ? Date.parse(input.createdAt) : NaN;
  const createdAt =
    existing?.createdAt ??
    (Number.isFinite(claimed) && claimed <= now.getTime()
      ? new Date(claimed).toISOString()
      : now.toISOString());

  const record: GalleryRecord = { id: input.id, ownerHash, title, intro, spots, createdAt };
  await store.put(record);
  return toPublic(record);
}

/** 게시 취소 (비공개 전환). 없는 코스는 성공으로 취급 */
export async function unpublishCourse(
  store: GalleryStore,
  id: unknown,
  ownerId: unknown,
): Promise<void> {
  if (typeof id !== "string" || !UUID.test(id) || typeof ownerId !== "string") {
    throw new GalleryError("INVALID");
  }
  const existing = await store.get(id);
  if (!existing) return;
  if (existing.ownerHash !== hashOwner(ownerId)) {
    throw new GalleryError("FORBIDDEN");
  }
  await store.remove(id);
}

function toPublic(record: GalleryRecord): PublicCourse {
  const { id, title, intro, spots, createdAt } = record;
  return { id, title, intro, spots, createdAt };
}

export async function listGallery(store: GalleryStore): Promise<PublicCourse[]> {
  return (await store.listNewest(GALLERY_PAGE_SIZE)).map(toPublic);
}
