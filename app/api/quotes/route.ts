import { NextResponse } from "next/server";
import { z } from "zod";
import { getBucket, getDatabase } from "@/lib/server-data";
import { whatsappUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const quoteSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().email().max(180).or(z.literal("")),
  city: z.string().trim().min(2).max(120),
  projectType: z.enum(["produto", "planejado", "ambiente"]),
  categories: z.array(z.string().max(80)).min(1).max(10),
  selectedProducts: z.array(z.object({ name: z.string().max(160), slug: z.string().max(180), quantity: z.number().int().min(1).max(99) })).max(30),
  dimensions: z.string().trim().max(1500),
  budget: z.string().trim().max(100),
  timeline: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(2000),
});

function parseJsonArray(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const parsed = quoteSchema.safeParse({
      name: form.get("name") ?? "",
      phone: form.get("phone") ?? "",
      email: form.get("email") ?? "",
      city: form.get("city") ?? "Goiânia",
      projectType: form.get("projectType") ?? "",
      categories: parseJsonArray(form.get("categories")),
      selectedProducts: parseJsonArray(form.get("selectedProducts")),
      dimensions: form.get("dimensions") ?? "",
      budget: form.get("budget") ?? "",
      timeline: form.get("timeline") ?? "",
      notes: form.get("notes") ?? "",
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Revise os campos obrigatórios." }, { status: 400 });
    }

    const images = form.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (images.length > 3 || images.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      return NextResponse.json({ error: "Envie até 3 imagens JPG, PNG ou WebP com no máximo 5 MB." }, { status: 400 });
    }

    const quote = parsed.data;
    const quoteId = crypto.randomUUID();
    const db = await getDatabase();
    await db
      .prepare(
        `INSERT INTO quote_requests
         (id, name, phone, email, city, project_type, categories_json,
          selected_products_json, dimensions, budget, timeline, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'novo')`,
      )
      .bind(
        quoteId,
        quote.name,
        quote.phone,
        quote.email || null,
        quote.city,
        quote.projectType,
        JSON.stringify(quote.categories),
        JSON.stringify(quote.selectedProducts),
        quote.dimensions,
        quote.budget,
        quote.timeline,
        quote.notes,
      )
      .run();

    if (images.length) {
      const bucket = await getBucket();
      for (const [index, file] of images.entries()) {
        const safeExtension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const key = `quotes/${quoteId}/${index + 1}-${crypto.randomUUID()}.${safeExtension}`;
        await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
        await db
          .prepare(
            `INSERT INTO quote_files (id, quote_id, object_key, filename, content_type, size)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(crypto.randomUUID(), quoteId, key, file.name.slice(0, 180), file.type, file.size)
          .run();
      }
    }

    const projectLabel = quote.projectType === "produto" ? "Produto" : quote.projectType === "planejado" ? "Móvel planejado" : "Ambiente completo";
    const message = [
      "Olá, Rony Móveis! Preenchi o orçamento pelo site.",
      `Referência: ${quoteId.slice(0, 8).toUpperCase()}`,
      "",
      `Nome: ${quote.name}`,
      `Tipo: ${projectLabel}`,
      `Interesse: ${quote.categories.join(", ")}`,
      quote.selectedProducts.length ? `Seleção: ${quote.selectedProducts.map((item) => `${item.name} (${item.quantity}x)`).join(", ")}` : "",
      quote.dimensions ? `Ambiente/medidas: ${quote.dimensions}` : "",
      quote.budget ? `Faixa de investimento: ${quote.budget}` : "",
      `Prazo: ${quote.timeline}`,
      quote.notes ? `Observações: ${quote.notes}` : "",
      images.length ? `${images.length} imagem(ns) de referência foram anexadas ao pedido.` : "",
    ].filter(Boolean).join("\n");

    return NextResponse.json({ id: quoteId, whatsappUrl: whatsappUrl(message) });
  } catch (error) {
    console.error("Falha ao registrar orçamento", error);
    return NextResponse.json({ error: "Não foi possível registrar o pedido neste momento." }, { status: 500 });
  }
}
