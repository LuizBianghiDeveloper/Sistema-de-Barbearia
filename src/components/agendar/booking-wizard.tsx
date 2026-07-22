"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Clock,
  Loader2,
  Scissors,
  User,
} from "lucide-react"
import { toast } from "sonner"
import {
  getSlotsAction,
  createAppointmentAction,
} from "@/actions/appointments"
import { type Slot } from "@/lib/slots-service"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type WizService = {
  id: string
  nome: string
  duracao_min: number
  preco: number
}
export type WizBarber = { id: string; nome: string }

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})
const DIAS_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
]

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  const p = (x: number) => String(x).padStart(2, "0")
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`
}

function dayParts(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return { weekday: DIAS_ABREV[dow], day: d, month: MESES[m - 1] }
}

type Step = 1 | 2 | 3 | 4

export function BookingWizard({
  services,
  barbers,
  hoje,
}: {
  services: WizService[]
  barbers: WizBarber[]
  hoje: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [service, setService] = useState<WizService | null>(null)
  const [barber, setBarber] = useState<WizBarber | null>(null)
  const [date, setDate] = useState<string>(hoje)
  const [slot, setSlot] = useState<Slot | null>(null)

  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, startLoadingSlots] = useTransition()
  const [confirming, startConfirming] = useTransition()

  const dias = Array.from({ length: 14 }, (_, i) => addDays(hoje, i))

  function loadSlots(b: string, s: string, d: string) {
    startLoadingSlots(async () => {
      setSlots(await getSlotsAction(b, s, d))
    })
  }

  function chooseService(s: WizService) {
    setService(s)
    setSlot(null)
    setStep(2)
  }
  function chooseBarber(b: WizBarber) {
    setBarber(b)
    setSlot(null)
    setStep(3)
    loadSlots(b.id, service!.id, date)
  }
  function chooseDate(d: string) {
    setDate(d)
    setSlot(null)
    loadSlots(barber!.id, service!.id, d)
  }
  function chooseSlot(s: Slot) {
    setSlot(s)
    setStep(4)
  }

  function confirm() {
    if (!service || !barber || !slot) return
    startConfirming(async () => {
      const res = await createAppointmentAction({
        barberId: barber.id,
        serviceId: service.id,
        inicioIso: slot.iso,
      })
      if ("error" in res) {
        toast.error(res.error)
        // horário perdido → volta pra seleção e recarrega
        setStep(3)
        setSlot(null)
        loadSlots(barber.id, service.id, date)
      } else {
        toast.success(res.success)
        router.push("/meus-agendamentos")
      }
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl">Agendar horário</h1>
        <p className="text-sm text-muted-foreground">
          Passo {step} de 4 ·{" "}
          {["Serviço", "Barbeiro", "Data e horário", "Confirmação"][step - 1]}
        </p>
      </div>

      {step > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep((s) => (s - 1) as Step)}
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
      )}

      {/* Passo 1 — serviço */}
      {step === 1 && (
        <div className="grid gap-3">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => chooseService(s)}
              className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Scissors className="size-5" />
                </span>
                <div>
                  <div className="font-medium">{s.nome}</div>
                  <div className="text-sm text-muted-foreground">
                    {s.duracao_min} min
                  </div>
                </div>
              </div>
              <div className="font-heading text-lg text-primary">
                {brl.format(s.preco)}
              </div>
            </button>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum serviço disponível no momento.
            </p>
          )}
        </div>
      )}

      {/* Passo 2 — barbeiro */}
      {step === 2 && (
        <div className="grid gap-3">
          {barbers.map((b) => (
            <button
              key={b.id}
              onClick={() => chooseBarber(b)}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <User className="size-5" />
              </span>
              <span className="font-medium">{b.nome}</span>
            </button>
          ))}
          {barbers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum barbeiro disponível no momento.
            </p>
          )}
        </div>
      )}

      {/* Passo 3 — data e horário */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dias.map((d) => {
              const { weekday, day, month } = dayParts(d)
              const ativo = d === date
              return (
                <button
                  key={d}
                  onClick={() => chooseDate(d)}
                  className={cn(
                    "flex min-w-[4rem] flex-col items-center rounded-lg border px-3 py-2 text-sm transition-colors",
                    ativo
                      ? "border-primary bg-primary/15"
                      : "border-border/70 hover:bg-accent"
                  )}
                >
                  <span className="text-xs text-muted-foreground">{weekday}</span>
                  <span className="text-lg font-medium">{day}</span>
                  <span className="text-xs text-muted-foreground">{month}</span>
                </button>
              )
            })}
          </div>

          {loadingSlots ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando horários…
            </div>
          ) : slots.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum horário livre nesta data. Tente outro dia.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  key={s.iso}
                  onClick={() => chooseSlot(s)}
                  className="rounded-lg border border-border/70 bg-card py-2.5 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/15"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Passo 4 — confirmação */}
      {step === 4 && service && barber && slot && (
        <div className="space-y-5">
          <div className="space-y-3 rounded-xl border border-border/70 bg-card p-5">
            <Resumo icon={<Scissors className="size-4" />} label="Serviço">
              {service.nome} · {service.duracao_min} min ·{" "}
              {brl.format(service.preco)}
            </Resumo>
            <Resumo icon={<User className="size-4" />} label="Barbeiro">
              {barber.nome}
            </Resumo>
            <Resumo icon={<Clock className="size-4" />} label="Quando">
              {(() => {
                const { weekday, day, month } = dayParts(date)
                return `${weekday}, ${day} de ${month} · ${slot.label}`
              })()}
            </Resumo>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={confirming}
            onClick={confirm}
          >
            {confirming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Confirmar agendamento
          </Button>
        </div>
      )}
    </div>
  )
}

function Resumo({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </span>
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="font-medium">{children}</div>
      </div>
    </div>
  )
}
