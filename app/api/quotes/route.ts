import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteManagedBlobs, isManagedBlobUrl } from "@/lib/blob-storage";
import { getDatabase } from "@/lib/server-data";
import { whatsappUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const uploadedFileSchema = z.object({
  url: z.string().url().max(700).refine(isManagedBlobUrl, "Arquivo inválido"),
  filename: z.string().trim().min(1).max(180),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(5 * 1024 * 1024),
});

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
  files: z.array(uploadedFileSchema).max(3).default([]),
});

export async function POST(request: Request) {
  let cleanupUrls: string[] = [];
  try {
    const parsed = quoteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Revise os campos obrigatórios." }, { status: 400 });
    }

    const quote = parsed.data;
    cleanupUrls = quote.files.map((file) => file.url);
    const quoteId = crypto.randomUUID();
    const db = await getDatabase();
    await db.batch([
      db.prepare(
        `INSERT INTO quote_requests
         (id, name, phone, email, city, project_type, categories_json,
          selected_products_json, dimensions, budget, timeline, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'novo')`,
      ).bind(
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
      ),
      ...quote.files.map((file) =>
        db.prepare(
          `INSERT INTO quote_files (id, quote_id, object_key, filename, content_type, size)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(crypto.randomUUID(), quoteId, file.url, file.filename, file.contentType, file.size),
      ),
    ]);
    cleanupUrls = [];

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
      quote.files.length ? `${quote.files.length} imagem(ns) de referência foram anexadas ao pedido.` : "",
    ].filter(Boolean).join("\n");

    return NextResponse.json({ id: quoteId, whatsappUrl: whatsappUrl(message) });
  } catch (error) {
    if (cleanupUrls.length) {
      try {
        await deleteManagedBlobs(cleanupUrls);
      } catch (cleanupError) {
        console.error("Falha ao remover anexos órfãos", cleanupError);
      }
    }
    console.error("Falha ao registrar orçamento", error);
    return NextResponse.json({ error: "Não foi possível registrar o pedido neste momento." }, { status: 500 });
  }
}
