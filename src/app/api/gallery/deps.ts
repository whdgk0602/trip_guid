import {
  createMemoryStore,
  createUpstashStore,
  type GalleryStore,
} from "@/lib/server/galleryStore";
import { UpstreamError } from "@/lib/server/llm";
import { createGalleryHandlers } from "./handlers";

const globalForGallery = globalThis as unknown as { devGalleryStore?: GalleryStore };

/**
 * Vercel Marketplace의 Upstash 연동이 넣어주는 KV_REST_API_* (직접 연결 시 UPSTASH_REDIS_REST_*).
 * 로컬에서 아직 값을 받아오지 않았다면 개발 서버에서만 메모리 저장소로 동작 — 운영에서는 오류.
 */
function getStore(): GalleryStore {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return createUpstashStore({ url, token });

  if (process.env.NODE_ENV === "production") {
    throw new UpstreamError("gallery storage is not configured");
  }
  if (!globalForGallery.devGalleryStore) {
    console.warn("[gallery] Upstash env missing — using in-memory store (dev only)");
    globalForGallery.devGalleryStore = createMemoryStore();
  }
  return globalForGallery.devGalleryStore;
}

export function getSigningSecret(): string {
  const secret = process.env.GALLERY_SIGNING_SECRET;
  if (!secret) throw new UpstreamError("GALLERY_SIGNING_SECRET is not configured");
  return secret;
}

export const galleryHandlers = createGalleryHandlers({ getStore, getSecret: getSigningSecret });
