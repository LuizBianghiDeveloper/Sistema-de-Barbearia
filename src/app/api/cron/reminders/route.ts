import { type NextRequest, NextResponse } from "next/server"
import { enviarLembretes } from "@/lib/reminders"

// Sempre dinâmico (nunca cacheia); roda no servidor.
export const dynamic = "force-dynamic"

/**
 * Disparado pelo agendador (Vercel Cron em produção) para enviar os
 * lembretes das próximas horas. Protegido por CRON_SECRET.
 *
 * Local: GET /api/cron/reminders?secret=SEU_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "")
    const qs = request.nextUrl.searchParams.get("secret")
    if (auth !== secret && qs !== secret) {
      return NextResponse.json({ error: "não autorizado" }, { status: 401 })
    }
  }

  const resumo = await enviarLembretes()
  return NextResponse.json({ ok: true, ...resumo })
}
