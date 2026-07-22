import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { formatLocal } from "@/lib/time"
import { CancelButton } from "@/components/agendar/cancel-button"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Appt = {
  id: string
  inicio: string
  fim: string
  status: "pendente" | "confirmado" | "cancelado"
  service: { nome: string } | null
  barber: { profile: { nome: string } | null } | null
}

const CANCEL_MIN_MS = 12 * 60 * 60 * 1000

export default async function MeusAgendamentosPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")

  const supabase = await createClient()
  const { data } = await supabase
    .from("appointments")
    .select(
      "id, inicio, fim, status, service:services(nome), barber:barbers(profile:profiles(nome))"
    )
    .eq("client_id", profile.userId)
    .order("inicio", { ascending: false })

  const appts = (data ?? []) as unknown as Appt[]
  // Server Component: lê a hora atual por requisição (regra de pureza não se aplica).
  // eslint-disable-next-line react-hooks/purity
  const agora = Date.now()
  const futuros = appts.filter(
    (a) => new Date(a.inicio).getTime() >= agora && a.status !== "cancelado"
  )
  const historico = appts.filter(
    (a) => new Date(a.inicio).getTime() < agora || a.status === "cancelado"
  )

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl">Meus agendamentos</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe e cancele seus horários.
          </p>
        </div>
        <Link href="/agendar" className={cn(buttonVariants())}>
          Novo agendamento
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg">Próximos</h2>
        {futuros.length === 0 ? (
          <p className="rounded-xl border border-border/70 bg-card p-6 text-center text-sm text-muted-foreground">
            Você não tem agendamentos futuros.
          </p>
        ) : (
          futuros.map((a) => {
            const podeCancelar =
              new Date(a.inicio).getTime() - agora >= CANCEL_MIN_MS
            return (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/70 bg-card p-4"
              >
                <div className="space-y-0.5">
                  <div className="font-medium">{a.service?.nome ?? "Serviço"}</div>
                  <div className="text-sm text-muted-foreground">
                    {a.barber?.profile?.nome ?? "Barbeiro"} ·{" "}
                    {formatLocal(a.inicio, "dd/MM/yyyy 'às' HH:mm")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge>Confirmado</Badge>
                  {podeCancelar ? (
                    <CancelButton id={a.id} />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      cancelar só até 12h antes
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </section>

      {historico.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg">Histórico</h2>
          {historico.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/60 p-4"
            >
              <div className="space-y-0.5">
                <div className="font-medium">{a.service?.nome ?? "Serviço"}</div>
                <div className="text-sm text-muted-foreground">
                  {a.barber?.profile?.nome ?? "Barbeiro"} ·{" "}
                  {formatLocal(a.inicio, "dd/MM/yyyy 'às' HH:mm")}
                </div>
              </div>
              {a.status === "cancelado" ? (
                <Badge variant="secondary">Cancelado</Badge>
              ) : (
                <Badge variant="secondary">Realizado</Badge>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

export const metadata = { title: "Meus agendamentos — Barbearia" }
