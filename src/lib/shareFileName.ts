const DEFAULT_FILE_NAME = "동네-큐레이터-코스.png";

export function buildShareFileName(title: string): string {
  const safe = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!safe) {
    return DEFAULT_FILE_NAME;
  }

  return `${safe}.png`;
}
