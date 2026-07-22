import { createAdminClient } from "@/lib/supabase/admin"
import { sendWhatsapp } from "@/lib/notifications/whatsapp"
import { formatLocal } from "@/lib/time"

const SHOP = "Lucas Simões Barbearia"

function horasAntes(): number {
  const h = Number(process.env.REMINDER_HOURS_BEFORE)
  return Number.isFinite(h) && h > 0 ? h : 3
}

type Row = {
  id: string
  inicio: string
  cliente_nome: string | null
  cliente_telefone: string | null
  service: { nome: string } | null
  barber: { profile: { nome: string } | null } | null
  client: { nome: string; telefone: string | null } | null
}

export type ReminderSummary = {
  janela_horas: number
  verificados: number
  enviados: number
  simulados: number
  sem_telefone: number
  falhas: number
}

function montarMensagem(
  nome: string,
  servico: string,
  barbeiro: string,
  quando: string
): string {
  return (
    `Olá, ${nome}! ✂️\n` +
    `Passando para lembrar do seu horário na ${SHOP}:\n` +
    `• ${servico} com ${barbeiro}\n` +
    `• ${quando}\n\n` +
    `Até logo! Se não puder vir, avise com antecedência.`
  )
}

/**
 * Encontra agendamentos confirmados que começam dentro da janela de
 * antecedência e ainda não foram lembrados, envia o WhatsApp e marca
 * como enviado (idempotente — não reenvia).
 */
export async function enviarLembretes(): Promise<ReminderSummary> {
  const supabase = createAdminClient()
  const janela = horasAntes()
  const agora = Date.now()
  const limite = new Date(agora + janela * 3_600_000).toISOString()
  const agoraIso = new Date(agora).toISOString()

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, inicio, cliente_nome, cliente_telefone, service:services(nome), barber:barbers(profile:profiles(nome)), client:profiles!appointments_client_id_fkey(nome, telefone)"
    )
    .eq("status", "confirmado")
    .is("lembrete_enviado_em", null)
    .gt("inicio", agoraIso)
    .lte("inicio", limite)
    .order("inicio")

  const rows = (data ?? []) as unknown as Row[]
  const resumo: ReminderSummary = {
    janela_horas: janela,
    verificados: rows.length,
    enviados: 0,
    simulados: 0,
    sem_telefone: 0,
    falhas: 0,
  }

  for (const a of rows) {
    const nome = a.client?.nome ?? a.cliente_nome ?? "cliente"
    const tel = a.client?.telefone ?? a.cliente_telefone
    const barbeiro = a.barber?.profile?.nome ?? "seu barbeiro"
    const servico = a.service?.nome ?? "seu horário"

    if (!tel) {
      resumo.sem_telefone++
      continue
    }

    const quando = formatLocal(a.inicio, "dd/MM 'às' HH:mm")
    const res = await sendWhatsapp(tel, montarMensagem(nome, servico, barbeiro, quando))

    if (res.ok) {
      await supabase
        .from("appointments")
        .update({ lembrete_enviado_em: new Date().toISOString() })
        .eq("id", a.id)
      if (res.simulated) resumo.simulados++
      else resumo.enviados++
    } else {
      resumo.falhas++
    }
  }

  return resumo
}
