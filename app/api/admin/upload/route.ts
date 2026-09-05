import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getBucket } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ error: "Selecione uma imagem." }, { status: 400 });
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Use JPG, PNG ou WebP com no máximo 8 MB." }, { status: 400 });
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `catalog/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const bucket = await getBucket();
  await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return NextResponse.json({ key, url: `/api/media/${key}` });
}
