import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { managedBlobKey } from "@/lib/blob-storage";
import { getDatabase } from "@/lib/server-data";
import { isSameOriginMutation } from "@/lib/security";

export const dynamic = "force-dynamic";

const imageSourceSchema = z.string().trim().min(1).max(600).refine((value) => {
  if (value.startsWith("/")) return !value.startsWith("//");
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Endereço de imagem inválido");

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
  priceMode: z.enum(["price", "from", "consult", "custom"]),
  availability: z.enum(["available", "order", "made_to_order", "out_of_stock"]),
  searchTerms: z.string().trim().max(500).default(""),
  badge: z.string().trim().max(80).nullable(),
  features: z.array(z.string().trim().min(1).max(180)).max(12),
  images: z.array(imageSourceSchema).max(10),
  active: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000),
});

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
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
        price_cents, old_price_cents, price_label, price_mode, availability, search_terms,
        badge, features_json, active, featured, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
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
      input.priceMode,
      input.availability,
      input.searchTerms,
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
        managedBlobKey(url),
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
