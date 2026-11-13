/**
 * 체크인 사진을 localStorage에 넣을 수 있게 줄인다.
 * 긴 변 640px · JPEG 품질 0.7 → 보통 40~120KB (localStorage 한도 ~5MB 안에서 수십 장).
 */
export const PHOTO_MAX_SIDE = 640;
const JPEG_QUALITY = 0.7;

/** 비율을 유지하며 긴 변이 maxSide를 넘지 않게. 이미 작으면 그대로 */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number = PHOTO_MAX_SIDE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** 브라우저 전용: 이미지 파일 → 줄인 JPEG data URL. 디코딩할 수 없는 파일이면 null */
export async function compressPhoto(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return null;
  }
}
