import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getManageableBarbers } from "@/lib/barbers"
import { createClient } from "@/lib/supabase/server"
import { DIAS_SEMANA } from "@/lib/time"
import { BarberPicker } from "@/components/config/barber-picker"
import { AddJornadaForm } from "@/components/config/add-jornada-form"
import { RemoveJornadaButton } from "@/components/config/remove-jornada-button"

type Intervalo = {
  id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
}

// Ordem de exibição: segunda a domingo.
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0]

export default async function JornadaPage({
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
        <h1 className="text-3xl">Horários de trabalho</h1>
        <p className="text-sm text-muted-foreground">
          {profile.role === "admin"
            ? "Nenhum barbeiro cadastrado ainda. Cadastre um em Barbeiros."
            : "Seu cadastro de barbeiro ainda não foi criado. Fale com o admin."}
        </p>
      </div>
    )
  }

  const { b } = await searchParams
  const selected = barbers.find((x) => x.id === b) ?? barbers[0]

  const supabase = await createClient()
  const { data } = await supabase
    .from("availability")
    .select("id, dia_semana, hora_inicio, hora_fim")
    .eq("barber_id", selected.id)
    .order("hora_inicio")

  const intervalos = (data ?? []) as Intervalo[]
  const porDia = new Map<number, Intervalo[]>()
  for (const iv of intervalos) {
    const arr = porDia.get(iv.dia_semana) ?? []
    arr.push(iv)
    porDia.set(iv.dia_semana, arr)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl">Horários de trabalho</h1>
        <p className="text-sm text-muted-foreground">
          Defina os intervalos de atendimento por dia da semana.
        </p>
      </div>

      <BarberPicker barbers={barbers} selectedId={selected.id} />

      <div className="space-y-3">
        {ORDEM_DIAS.map((dia) => {
          const doDia = porDia.get(dia) ?? []
          return (
            <div
              key={dia}
              className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-[8rem_1fr] sm:items-center"
            >
              <div className="font-heading text-lg">{DIAS_SEMANA[dia]}</div>

              <div className="flex flex-wrap items-center gap-2">
                {doDia.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Sem atendimento
                  </span>
                )}
                {doDia.map((iv) => (
                  <span
                    key={iv.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/15 py-1 pl-3 pr-1 text-sm text-foreground"
                  >
                    {iv.hora_inicio.slice(0, 5)} – {iv.hora_fim.slice(0, 5)}
                    <RemoveJornadaButton id={iv.id} />
                  </span>
                ))}
              </div>

              <div className="sm:col-start-2">
                <AddJornadaForm barberId={selected.id} diaSemana={dia} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
