import { NextResponse } from "next/server";
import { getBucket } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const bucket = await getBucket();
  const object = await bucket.get(key.join("/"));
  if (!object) return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has("content-type") && object.httpMetadata?.contentType) {
    headers.set("content-type", object.httpMetadata.contentType);
  }
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
