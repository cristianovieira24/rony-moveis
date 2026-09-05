import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getBucket, getDatabase } from "@/lib/server-data";
import { productInputSchema } from "../route";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = productInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados do produto.", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await params;
  const input = parsed.data;
  const db = await getDatabase();
  const previousImages = await db
    .prepare("SELECT source_url, object_key FROM product_images WHERE product_id = ?")
    .bind(id)
    .all<{ source_url: string; object_key: string | null }>();
  const statements = [
    db.prepare(
      `UPDATE products SET
       slug = ?, name = ?, eyebrow = ?, short_description = ?, description = ?, category_id = ?,
       price_cents = ?, old_price_cents = ?, price_label = ?, badge = ?, features_json = ?,
       active = ?, featured = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).bind(
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
      id,
    ),
    db.prepare("DELETE FROM product_images WHERE product_id = ?").bind(id),
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
    const retained = new Set(input.images);
    const bucket = await getBucket();
    await Promise.all(
      (previousImages.results ?? [])
        .filter((image) => image.object_key && !retained.has(image.source_url))
        .map((image) => bucket.delete(image.object_key as string)),
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Falha ao editar produto", error);
    return NextResponse.json({ error: "Não foi possível salvar as alterações." }, { status: 409 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const db = await getDatabase();
  const images = await db
    .prepare("SELECT object_key FROM product_images WHERE product_id = ? AND object_key IS NOT NULL")
    .bind(id)
    .all<{ object_key: string }>();
  await db.prepare("DELETE FROM product_images WHERE product_id = ?").bind(id).run();
  await db.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  const bucket = await getBucket();
  await Promise.all((images.results ?? []).map((image) => bucket.delete(image.object_key)));
  return NextResponse.json({ ok: true });
}
