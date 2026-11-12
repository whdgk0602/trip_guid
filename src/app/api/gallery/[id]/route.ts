import { galleryHandlers } from "../deps";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return galleryHandlers.publish(request, id);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return galleryHandlers.unpublish(request, id);
}
