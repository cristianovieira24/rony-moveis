import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { managedBlobKey } from "@/lib/blob-storage";
import { getDatabase, PUBLIC_DATA_TAG } from "@/lib/server-data";
import { isSameOriginMutation } from "@/lib/security";

export const dynamic = "force-dynamic";

const categoryImageSchema = z.string().trim().max(700).refine((value) => {
  if (!value) return true;
  if (value.startsWith("/")) return !value.startsWith("//");
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Endereço de imagem inválido");

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  description: z.string().trim().max(500).default(""),
  parentId: z.string().max(100).nullable(),
  imageUrl: categoryImageSchema.default(""),
  imageFit: z.enum(["cover", "contain"]).default("cover"),
  active: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000),
});

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = categoryInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados da categoria." }, { status: 400 });
  const input = parsed.data;
  const id = crypto.randomUUID();
  try {
    const db = await getDatabase();
    await db.prepare(
      `INSERT INTO categories
       (id, slug, name, description, parent_id, image_url, image_fit, object_key, active, featured, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    ).bind(
      id, input.slug, input.name, input.description, input.parentId || null,
      input.imageUrl, input.imageFit, managedBlobKey(input.imageUrl), input.active ? 1 : 0,
      input.featured ? 1 : 0, input.sortOrder,
    ).run();
    revalidateTag(PUBLIC_DATA_TAG, "max");
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("Falha ao criar categoria", error);
    return NextResponse.json({ error: "Não foi possível salvar. Confira se este endereço já existe." }, { status: 409 });
  }
}
