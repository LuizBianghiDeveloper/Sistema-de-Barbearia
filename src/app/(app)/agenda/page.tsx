import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarDays, ChevronLeft, ChevronRight, Phone } from "lucide-react"
import { getSessionProfile } from "@/lib/auth"
import { getManageableBarbers } from "@/lib/barbers"
import { createClient } from "@/lib/supabase/server"
import { DIAS_SEMANA, formatLocal, localToUtc } from "@/lib/time"
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

  const supabase = await createClient()
  const [{ data: apptData }, { data: servicesData }] = await Promise.all([
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
      .from("services")
      .select("id, nome, duracao_min")
      .eq("ativo", true)
      .order("nome"),
  ])

  const appts = (apptData ?? []) as unknown as Appt[]
  const services = servicesData ?? []

  // Agrupa por data local (para a visão semanal).
  const porDia = new Map<string, Appt[]>()
  for (const a of appts) {
    const dia = formatLocal(a.inicio, "yyyy-MM-dd")
    const arr = porDia.get(dia) ?? []
    arr.push(a)
    porDia.set(dia, arr)
  }

  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(inicioRange, i))
  const link = (p: Record<string, string>) => {
    const params = new URLSearchParams({ b: selected.id, v: semana ? "semana" : "dia", d: data, ...p })
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

      {/* Controles: dia/semana + navegação */}
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

      {/* Conteúdo */}
      {semana ? (
        <div className="space-y-4">
          {diasSemana.map((dia) => (
            <div key={dia} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {rotuloData(dia)}
              </h2>
              <ListaAppts appts={porDia.get(dia) ?? []} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="font-heading text-xl">{rotuloData(data)}</h2>
          <ListaAppts appts={appts} />
        </div>
      )}
    </div>
  )
}

function ListaAppts({ appts }: { appts: Appt[] }) {
  if (appts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
        <CalendarDays className="size-4" />
        Nenhum atendimento.
      </div>
    )
  }
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card">
      {appts.map((a) => {
        const nome = a.client?.nome ?? a.cliente_nome ?? "Cliente"
        const tel = a.client?.telefone ?? a.cliente_telefone
        const avulso = !a.client
        return (
          <li key={a.id} className="flex items-center gap-4 p-4">
            <div className="w-24 shrink-0 font-heading text-lg">
              {formatLocal(a.inicio, "HH:mm")}
              <div className="font-sans text-xs font-normal text-muted-foreground">
                {formatLocal(a.inicio, "HH:mm")}–{formatLocal(a.fim, "HH:mm")}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{a.service?.nome ?? "Serviço"}</div>
              <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                <span>{nome}</span>
                {avulso && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    avulso
                  </span>
                )}
                {tel && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" />
                    {tel}
                  </span>
                )}
              </div>
            </div>
            <CancelAgendaButton id={a.id} />
          </li>
        )
      })}
    </ul>
  )
}

export const metadata = { title: "Agenda — Barbearia" }
