"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  getSlotsAction,
  createAppointmentByBarberAction,
} from "@/actions/appointments"
import { type Slot } from "@/lib/slots-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type Service = { id: string; nome: string; duracao_min: number }

export function NovoAgendamentoDialog({
  barberId,
  services,
  dataInicial,
}: {
  barberId: string
  services: Service[]
  dataInicial: string
}) {
  const [open, setOpen] = useState(false)
  const [serviceId, setServiceId] = useState<string>("")
  const [data, setData] = useState(dataInicial)
  const [slots, setSlots] = useState<Slot[]>([])
  const [slot, setSlot] = useState<Slot | null>(null)
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")

  const [loadingSlots, loadTransition] = useTransition()
  const [saving, saveTransition] = useTransition()

  function reset() {
    setServiceId("")
    setData(dataInicial)
    setSlots([])
    setSlot(null)
    setNome("")
    setTelefone("")
  }

  function loadSlots(sId: string, d: string) {
    if (!sId || !d) return
    setSlot(null)
    loadTransition(async () => setSlots(await getSlotsAction(barberId, sId, d)))
  }

  function submit() {
    if (!serviceId || !slot || nome.trim().length < 2) {
      toast.error("Preencha serviço, horário e nome do cliente.")
      return
    }
    saveTransition(async () => {
      const res = await createAppointmentByBarberAction({
        barberId,
        serviceId,
        inicioIso: slot.iso,
        clienteNome: nome,
        clienteTelefone: telefone,
      })
      if ("error" in res) {
        toast.error(res.error)
        if (serviceId && data) loadSlots(serviceId, data)
      } else {
        toast.success(res.success)
        setOpen(false)
        reset()
      }
    })
  }

  return (
    <>
      <Button
        onClick={() => {
          reset()
          setOpen(true)
        }}
      >
        <Plus className="size-4" />
        Novo agendamento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo agendamento</DialogTitle>
            <DialogDescription>
              Para cliente que marcou pessoalmente ou por telefone.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Serviço</span>
              <div className="flex flex-wrap gap-2">
                {services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setServiceId(s.id)
                      loadSlots(s.id, data)
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      serviceId === s.id
                        ? "border-primary bg-primary/15"
                        : "border-border/70 hover:bg-accent"
                    )}
                  >
                    {s.nome}{" "}
                    <span className="text-muted-foreground">
                      · {s.duracao_min}min
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Field label="Data" htmlFor="data">
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => {
                  setData(e.target.value)
                  if (serviceId) loadSlots(serviceId, e.target.value)
                }}
              />
            </Field>

            {serviceId && (
              <div className="grid gap-1.5">
                <span className="text-sm font-medium">Horário</span>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Carregando…
                  </div>
                ) : slots.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">
                    Nenhum horário livre nesta data.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((s) => (
                      <button
                        key={s.iso}
                        type="button"
                        onClick={() => setSlot(s)}
                        className={cn(
                          "rounded-lg border py-2 text-sm transition-colors",
                          slot?.iso === s.iso
                            ? "border-primary bg-primary/15"
                            : "border-border/70 hover:bg-accent"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Field label="Nome do cliente" htmlFor="cliente-nome">
              <Input
                id="cliente-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome"
              />
            </Field>
            <Field label="Telefone (opcional)" htmlFor="cliente-tel">
              <Input
                id="cliente-tel"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-0000"
              />
            </Field>

            <Button onClick={submit} disabled={saving} className="mt-1">
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Criar agendamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
