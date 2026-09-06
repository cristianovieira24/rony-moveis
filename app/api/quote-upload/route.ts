import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { clientIp, consumeRateLimit, isSameOriginMutation } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
    const rate = consumeRateLimit(`quote-upload:${clientIp(request)}`, 18, 60 * 60 * 1000);
    if (!rate.allowed) return NextResponse.json({ error: "Limite temporário de anexos atingido." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("quotes/")) throw new Error("Destino de upload inválido.");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 5 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: "rony-public-quote",
        };
      },
      onUploadCompleted: async () => undefined,
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Falha ao autorizar anexo de orçamento", error);
    return NextResponse.json({ error: "Não foi possível enviar a referência." }, { status: 400 });
  }
}
