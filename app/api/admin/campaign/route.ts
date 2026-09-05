import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { getDatabase } from "@/lib/server-data";

export const dynamic = "force-dynamic";

const campaignSchema = z.object({
  id: z.string().min(1).max(100),
  eyebrow: z.string().trim().min(2).max(140),
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(5).max(500),
  ctaLabel: z.string().trim().min(2).max(80),
  ctaHref: z.string().trim().startsWith("/").max(300),
  imageUrl: z.string().trim().min(1).max(600),
  active: z.boolean(),
});

export async function PATCH(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = campaignSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os campos do destaque." }, { status: 400 });
  const input = parsed.data;
  const db = await getDatabase();
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
      input.imageUrl.startsWith("/api/media/") ? input.imageUrl.slice("/api/media/".length) : null,
      input.active ? 1 : 0,
      input.id,
    )
    .run();
  return NextResponse.json({ ok: true });
}
