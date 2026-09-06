import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { getDatabase } from "@/lib/server-data";
import { isSameOriginMutation } from "@/lib/security";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  tagline: z.string().trim().min(2).max(180),
  announcement: z.string().trim().max(220),
  whatsappNumber: z.string().trim().regex(/^\d{10,15}$/),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().email().max(180),
  instagramUrl: z.string().trim().url().max(400).refine((value) => value.startsWith("https://"), "Use um endereço seguro"),
  address: z.string().trim().min(5).max(300),
  shortAddress: z.string().trim().min(5).max(180),
  mapUrl: z.string().trim().url().max(500).refine((value) => value.startsWith("https://"), "Use um endereço seguro"),
  openingHours: z.string().trim().max(240),
  seoTitle: z.string().trim().min(10).max(100),
  seoDescription: z.string().trim().min(20).max(220),
});

export async function PATCH(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = settingsSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados da loja." }, { status: 400 });
  const db = await getDatabase();
  await db.prepare(
    `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
  ).bind("store_profile", JSON.stringify(parsed.data)).run();
  return NextResponse.json({ ok: true });
}
