import { galleryHandlers } from "./deps";

export async function GET() {
  return galleryHandlers.list();
}
