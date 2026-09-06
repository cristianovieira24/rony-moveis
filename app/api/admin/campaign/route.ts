import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { deleteManagedBlobs, managedBlobKey } from "@/lib/blob-storage";
import { getDatabase } from "@/lib/server-data";
import { isSameOriginMutation } from "@/lib/security";

export const dynamic = "force-dynamic";

const campaignSchema = z.object({
  id: z.string().min(1).max(100),
  eyebrow: z.string().trim().min(2).max(140),
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(5).max(500),
  ctaLabel: z.string().trim().min(2).max(80),
  ctaHref: z.string().trim().startsWith("/").max(300).refine((value) => !value.startsWith("//"), "Destino inválido"),
  imageUrl: z.string().trim().min(1).max(600).refine((value) => {
    if (value.startsWith("/")) return !value.startsWith("//");
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }, "Imagem inválida"),
  active: z.boolean(),
});

export async function PATCH(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = campaignSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os campos do destaque." }, { status: 400 });
  const input = parsed.data;
  const db = await getDatabase();
  const previous = await db
    .prepare("SELECT object_key FROM campaigns WHERE id = ?")
    .bind(input.id)
    .first<{ object_key: string | null }>();
  await db.prepare(
      `UPDATE campaigns SET eyebrow = ?, title = ?, description = ?, cta_label = ?, cta_href = ?,
       image_url = ?, object_key = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    )
    .bind(
      input.eyebrow,
      input.title,
      input.description,
      input.ctaLabel,
      input.ctaHref,
      input.imageUrl,
      managedBlobKey(input.imageUrl),
      input.active ? 1 : 0,
      input.id,
    )
    .run();
  if (previous?.object_key && previous.object_key !== input.imageUrl) {
    try {
      await deleteManagedBlobs([previous.object_key]);
    } catch (error) {
      console.error("Falha ao remover imagem antiga do destaque", error);
    }
  }
  return NextResponse.json({ ok: true });
}
