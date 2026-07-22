import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarDays, ChevronLeft, ChevronRight, Phone, Repeat } from "lucide-react"
import { getSessionProfile } from "@/lib/auth"
import { getManageableBarbers } from "@/lib/barbers"
import { createClient } from "@/lib/supabase/server"
import { DIAS_SEMANA, formatLocal, localToUtc, timeToMinutes } from "@/lib/time"
import { BarberPicker } from "@/components/config/barber-picker"
import { NovoAgendamentoDialog } from "@/components/agenda/novo-agendamento-dialog"
import { CancelAgendaButton } from "@/components/agenda/cancel-agenda-button"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Appt = {
  id: string
  inicio: string
  fim: string
  cliente_nome: string | null
  cliente_telefone: string | null
  service: { nome: string } | null
  client: { nome: string; telefone: string | null } | null
}

type Reserva = {
  id: string
  cliente_nome: string
  cliente_telefone: string | null
  dia_semana: number
  hora_inicio: string
  data_inicio: string
  data_fim: string | null
  ativo: boolean
  service: { nome: string; duracao_min: number } | null
}

/** Item unificado exibido na agenda. */
type Item = {
  key: string
  inicioMs: number
  horaIni: string
  horaFim: string
  titulo: string
  cliente: string
  telefone: string | null
  tipo: "agendamento" | "fixo"
  apptId?: string
  avulso?: boolean
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  const p = (x: number) => String(x).padStart(2, "0")
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`
}
function diaSemana(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}
function segundaDaSemana(dateStr: string): string {
  const dow = diaSemana(dateStr)
  return addDays(dateStr, dow === 0 ? -6 : 1 - dow)
}
function rotuloData(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number)
  return `${DIAS_SEMANA[diaSemana(dateStr)]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`
}
function minutosParaHHMM(min: number): string {
  const p = (x: number) => String(x).padStart(2, "0")
  return `${p(Math.floor(min / 60))}:${p(min % 60)}`
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string; d?: string; v?: string }>
}) {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")
  if (profile.role === "client") redirect("/painel")

  const barbers = await getManageableBarbers(profile)
  if (barbers.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl">Agenda</h1>
        <p className="text-sm text-muted-foreground">
          {profile.role === "admin"
            ? "Nenhum barbeiro cadastrado ainda."
            : "Seu cadastro de barbeiro ainda não foi criado. Fale com o admin."}
        </p>
      </div>
    )
  }

  const sp = await searchParams
  const selected = barbers.find((x) => x.id === sp.b) ?? barbers[0]
  const hoje = formatLocal(new Date(), "yyyy-MM-dd")
  const data = sp.d ?? hoje
  const semana = sp.v === "semana"

  const inicioRange = semana ? segundaDaSemana(data) : data
  const fimRange = semana ? addDays(inicioRange, 7) : addDays(data, 1)
  const datasNoRange = semana
    ? Array.from({ length: 7 }, (_, i) => addDays(inicioRange, i))
    : [data]

  const supabase = await createClient()
  const [{ data: apptData }, { data: reservasData }, { data: servicesData }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, inicio, fim, cliente_nome, cliente_telefone, service:services(nome), client:profiles!appointments_client_id_fkey(nome, telefone)"
        )
        .eq("barber_id", selected.id)
        .neq("status", "cancelado")
        .gte("inicio", localToUtc(inicioRange, "00:00").toISOString())
        .lt("inicio", localToUtc(fimRange, "00:00").toISOString())
        .order("inicio"),
      supabase
        .from("reservas_fixas")
        .select(
          "id, cliente_nome, cliente_telefone, dia_semana, hora_inicio, data_inicio, data_fim, ativo, service:services(nome, duracao_min)"
        )
        .eq("barber_id", selected.id)
        .eq("ativo", true),
      supabase
        .from("services")
        .select("id, nome, duracao_min")
        .eq("ativo", true)
        .order("nome"),
    ])

  const appts = (apptData ?? []) as unknown as Appt[]
  const reservas = (reservasData ?? []) as unknown as Reserva[]
  const services = servicesData ?? []

  // Agrupa itens (agendamentos + ocorrências de mensalistas) por data local.
  const porDia = new Map<string, Item[]>()
  const add = (dia: string, item: Item) => {
    const arr = porDia.get(dia) ?? []
    arr.push(item)
    porDia.set(dia, arr)
  }

  for (const a of appts) {
    const dia = formatLocal(a.inicio, "yyyy-MM-dd")
    add(dia, {
      key: a.id,
      inicioMs: new Date(a.inicio).getTime(),
      horaIni: formatLocal(a.inicio, "HH:mm"),
      horaFim: formatLocal(a.fim, "HH:mm"),
      titulo: a.service?.nome ?? "Serviço",
      cliente: a.client?.nome ?? a.cliente_nome ?? "Cliente",
      telefone: a.client?.telefone ?? a.cliente_telefone,
      tipo: "agendamento",
      apptId: a.id,
      avulso: !a.client,
    })
  }

  for (const dia of datasNoRange) {
    const dow = diaSemana(dia)
    for (const r of reservas) {
      if (r.dia_semana !== dow) continue
      if (dia < r.data_inicio) continue
      if (r.data_fim && dia > r.data_fim) continue
      const ini = timeToMinutes(r.hora_inicio.slice(0, 5))
      const dur = r.service?.duracao_min ?? 30
      add(dia, {
        key: `${r.id}-${dia}`,
        inicioMs: localToUtc(dia, r.hora_inicio.slice(0, 5)).getTime(),
        horaIni: minutosParaHHMM(ini),
        horaFim: minutosParaHHMM(ini + dur),
        titulo: r.service?.nome ?? "Serviço",
        cliente: r.cliente_nome,
        telefone: r.cliente_telefone,
        tipo: "fixo",
      })
    }
  }

  for (const [, arr] of porDia) arr.sort((a, b) => a.inicioMs - b.inicioMs)

  const link = (p: Record<string, string>) => {
    const params = new URLSearchParams({
      b: selected.id,
      v: semana ? "semana" : "dia",
      d: data,
      ...p,
    })
    return `/agenda?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Seus atendimentos por dia e semana.
          </p>
        </div>
        <NovoAgendamentoDialog
          barberId={selected.id}
          services={services}
          dataInicial={data}
        />
      </div>

      <BarberPicker barbers={barbers} selectedId={selected.id} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border/70 p-0.5">
          <Link
            href={link({ v: "dia" })}
            className={cn(
              "rounded-md px-3 py-1 text-sm",
              !semana ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Dia
          </Link>
          <Link
            href={link({ v: "semana" })}
            className={cn(
              "rounded-md px-3 py-1 text-sm",
              semana ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Semana
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={link({ d: addDays(data, semana ? -7 : -1) })}
            className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
            aria-label="Anterior"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href={link({ d: hoje })}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Hoje
          </Link>
          <Link
            href={link({ d: addDays(data, semana ? 7 : 1) })}
            className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
            aria-label="Próximo"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      {semana ? (
        <div className="space-y-4">
          {datasNoRange.map((dia) => (
            <div key={dia} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {rotuloData(dia)}
              </h2>
              <ListaItens itens={porDia.get(dia) ?? []} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="font-heading text-xl">{rotuloData(data)}</h2>
          <ListaItens itens={porDia.get(data) ?? []} />
        </div>
      )}
    </div>
  )
}

function ListaItens({ itens }: { itens: Item[] }) {
  if (itens.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
        <CalendarDays className="size-4" />
        Nenhum atendimento.
      </div>
    )
  }
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card">
      {itens.map((it) => (
        <li key={it.key} className="flex items-center gap-4 p-4">
          <div className="w-24 shrink-0 font-heading text-lg">
            {it.horaIni}
            <div className="font-sans text-xs font-normal text-muted-foreground">
              {it.horaIni}–{it.horaFim}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium">{it.titulo}</div>
            <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span>{it.cliente}</span>
              {it.tipo === "fixo" && (
                <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                  <Repeat className="size-3" />
                  fixo
                </span>
              )}
              {it.avulso && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  avulso
                </span>
              )}
              {it.telefone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  {it.telefone}
                </span>
              )}
            </div>
          </div>
          {it.tipo === "agendamento" && it.apptId && (
            <CancelAgendaButton id={it.apptId} />
          )}
        </li>
      ))}
    </ul>
  )
}

export const metadata = { title: "Agenda — Barbearia" }
