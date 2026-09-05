import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { getDatabase } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = z.object({ status: z.enum(["novo", "em_atendimento", "concluido", "arquivado"]) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  const { id } = await params;
  const db = await getDatabase();
  await db.prepare("UPDATE quote_requests SET status = ? WHERE id = ?").bind(parsed.data.status, id).run();
  return NextResponse.json({ ok: true });
}
