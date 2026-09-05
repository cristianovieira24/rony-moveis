import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { getDatabase } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  eyebrow: z.string().trim().max(100).default(""),
  shortDescription: z.string().trim().max(400).default(""),
  description: z.string().trim().max(3000).default(""),
  categoryId: z.string().min(1).max(100),
  priceCents: z.number().int().nonnegative().nullable(),
  oldPriceCents: z.number().int().nonnegative().nullable(),
  priceLabel: z.string().trim().max(180).nullable(),
  badge: z.string().trim().max(80).nullable(),
  features: z.array(z.string().trim().min(1).max(180)).max(12),
  images: z.array(z.string().trim().min(1).max(600)).max(10),
  active: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000),
});

export async function POST(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = productInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados do produto.", details: parsed.error.flatten() }, { status: 400 });

  const input = parsed.data;
  const id = crypto.randomUUID();
  const db = await getDatabase();
  const statements = [
    db.prepare(
      `INSERT INTO products
       (id, slug, name, eyebrow, short_description, description, category_id,
        price_cents, old_price_cents, price_label, badge, features_json,
        active, featured, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    ).bind(
      id,
      input.slug,
      input.name,
      input.eyebrow,
      input.shortDescription,
      input.description,
      input.categoryId,
      input.priceCents,
      input.oldPriceCents,
      input.priceLabel || null,
      input.badge || null,
      JSON.stringify(input.features),
      input.active ? 1 : 0,
      input.featured ? 1 : 0,
      input.sortOrder,
    ),
    ...input.images.map((url, index) =>
      db.prepare(
        `INSERT INTO product_images (id, product_id, source_url, object_key, alt, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        id,
        url,
        url.startsWith("/api/media/") ? url.slice("/api/media/".length) : null,
        input.name,
        index,
      ),
    ),
  ];
  try {
    await db.batch(statements);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("Falha ao criar produto", error);
    return NextResponse.json({ error: "Não foi possível salvar. Confira se o endereço do produto já existe." }, { status: 409 });
  }
}
