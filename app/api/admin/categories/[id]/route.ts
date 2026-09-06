import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { deleteManagedBlobs, managedBlobKey } from "@/lib/blob-storage";
import { getDatabase } from "@/lib/server-data";
import { isSameOriginMutation } from "@/lib/security";
import { categoryInputSchema } from "../route";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = categoryInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados da categoria." }, { status: 400 });
  const { id } = await params;
  if (parsed.data.parentId === id) return NextResponse.json({ error: "Uma categoria não pode ser filha dela mesma." }, { status: 400 });
  const input = parsed.data;
  try {
    const db = await getDatabase();
    const previous = await db.prepare("SELECT object_key FROM categories WHERE id = ?").bind(id).first<{ object_key: string | null }>();
    await db.prepare(
      `UPDATE categories SET slug = ?, name = ?, description = ?, parent_id = ?, image_url = ?, object_key = ?,
       active = ?, featured = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).bind(
      input.slug, input.name, input.description, input.parentId || null, input.imageUrl,
      managedBlobKey(input.imageUrl), input.active ? 1 : 0, input.featured ? 1 : 0,
      input.sortOrder, id,
    ).run();
    if (previous?.object_key && previous.object_key !== input.imageUrl) {
      try { await deleteManagedBlobs([previous.object_key]); } catch (error) { console.error("Falha ao remover imagem antiga da categoria", error); }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Falha ao editar categoria", error);
    return NextResponse.json({ error: "Não foi possível salvar esta categoria." }, { status: 409 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const db = await getDatabase();
  const references = await db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM products WHERE category_id = ?) AS products,
       (SELECT COUNT(*) FROM categories WHERE parent_id = ?) AS children`,
  ).bind(id, id).first<{ products: string | number; children: string | number }>();
  if (Number(references?.products ?? 0) || Number(references?.children ?? 0)) {
    await db.prepare("UPDATE categories SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
    return NextResponse.json({ ok: true, hidden: true });
  }
  const previous = await db.prepare("SELECT object_key FROM categories WHERE id = ?").bind(id).first<{ object_key: string | null }>();
  await db.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  try { await deleteManagedBlobs([previous?.object_key]); } catch (error) { console.error("Falha ao remover imagem da categoria", error); }
  return NextResponse.json({ ok: true, hidden: false });
}

