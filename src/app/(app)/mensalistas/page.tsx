import { redirect } from "next/navigation"
import { Phone } from "lucide-react"
import { getSessionProfile } from "@/lib/auth"
import { getManageableBarbers } from "@/lib/barbers"
import { createClient } from "@/lib/supabase/server"
import { DIAS_SEMANA, formatLocal } from "@/lib/time"
import { BarberPicker } from "@/components/config/barber-picker"
import { AddReservaForm } from "@/components/mensalistas/add-reserva-form"
import { ReservaActions } from "@/components/mensalistas/reserva-actions"
import { Badge } from "@/components/ui/badge"

type Reserva = {
  id: string
  cliente_nome: string
  cliente_telefone: string | null
  dia_semana: number
  hora_inicio: string
  data_inicio: string
  data_fim: string | null
  ativo: boolean
  service: { nome: string } | null
}

export default async function MensalistasPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string }>
}) {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")
  if (profile.role === "client") redirect("/painel")

  const barbers = await getManageableBarbers(profile)
  if (barbers.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl">Mensalistas</h1>
        <p className="text-sm text-muted-foreground">
          {profile.role === "admin"
            ? "Nenhum barbeiro cadastrado ainda."
            : "Seu cadastro de barbeiro ainda não foi criado."}
        </p>
      </div>
    )
  }

  const { b } = await searchParams
  const selected = barbers.find((x) => x.id === b) ?? barbers[0]
  const hoje = formatLocal(new Date(), "yyyy-MM-dd")

  const supabase = await createClient()
  const [{ data: reservasData }, { data: servicesData }] = await Promise.all([
    supabase
      .from("reservas_fixas")
      .select(
        "id, cliente_nome, cliente_telefone, dia_semana, hora_inicio, data_inicio, data_fim, ativo, service:services(nome)"
      )
      .eq("barber_id", selected.id)
      .order("dia_semana")
      .order("hora_inicio"),
    supabase
      .from("services")
      .select("id, nome, duracao_min")
      .eq("ativo", true)
      .order("nome"),
  ])

  const reservas = (reservasData ?? []) as unknown as Reserva[]
  const services = servicesData ?? []

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl">Mensalistas</h1>
        <p className="text-sm text-muted-foreground">
          Horários fixos reservados toda semana. O slot fica bloqueado para
          agendamento comum.
        </p>
      </div>

      <BarberPicker barbers={barbers} selectedId={selected.id} />

      <AddReservaForm barberId={selected.id} services={services} hoje={hoje} />

      <div className="rounded-xl border border-border/70 bg-card">
        {reservas.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhum mensalista cadastrado.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {reservas.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="font-heading text-lg">
                      {DIAS_SEMANA[r.dia_semana]} · {r.hora_inicio.slice(0, 5)}
                    </span>
                    {!r.ativo && <Badge variant="secondary">Pausado</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    <span>{r.cliente_nome}</span>
                    <span>· {r.service?.nome ?? "Serviço"}</span>
                    {r.cliente_telefone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" />
                        {r.cliente_telefone}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    desde {formatLocal(`${r.data_inicio}T12:00:00Z`, "dd/MM/yyyy")}
                    {r.data_fim &&
                      ` até ${formatLocal(`${r.data_fim}T12:00:00Z`, "dd/MM/yyyy")}`}
                  </div>
                </div>
                <ReservaActions id={r.id} ativo={r.ativo} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export const metadata = { title: "Mensalistas — Barbearia" }
