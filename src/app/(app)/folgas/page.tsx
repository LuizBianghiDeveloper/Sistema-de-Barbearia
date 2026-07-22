import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { getManageableBarbers } from "@/lib/barbers"
import { createClient } from "@/lib/supabase/server"
import { formatLocal } from "@/lib/time"
import { BarberPicker } from "@/components/config/barber-picker"
import { AddFolgaForm } from "@/components/config/add-folga-form"
import { RemoveFolgaButton } from "@/components/config/remove-folga-button"

type Folga = {
  id: string
  inicio: string
  fim: string
  motivo: string | null
}

export default async function FolgasPage({
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
        <h1 className="text-3xl">Bloqueios e folgas</h1>
        <p className="text-sm text-muted-foreground">
          {profile.role === "admin"
            ? "Nenhum barbeiro cadastrado ainda."
            : "Seu cadastro de barbeiro ainda não foi criado. Fale com o admin."}
        </p>
      </div>
    )
  }

  const { b } = await searchParams
  const selected = barbers.find((x) => x.id === b) ?? barbers[0]

  const supabase = await createClient()
  const { data } = await supabase
    .from("time_off")
    .select("id, inicio, fim, motivo")
    .eq("barber_id", selected.id)
    .order("inicio", { ascending: true })

  const folgas = (data ?? []) as Folga[]

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl">Bloqueios e folgas</h1>
        <p className="text-sm text-muted-foreground">
          Períodos indisponíveis — têm prioridade sobre a jornada semanal.
        </p>
      </div>

      <BarberPicker barbers={barbers} selectedId={selected.id} />

      <AddFolgaForm barberId={selected.id} />

      <div className="rounded-xl border border-border/70 bg-card">
        {folgas.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhum bloqueio cadastrado.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {folgas.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="font-medium">
                    {formatLocal(f.inicio, "dd/MM/yyyy")} ·{" "}
                    {formatLocal(f.inicio, "HH:mm")} – {formatLocal(f.fim, "HH:mm")}
                  </div>
                  {f.motivo && (
                    <div className="text-sm text-muted-foreground">{f.motivo}</div>
                  )}
                </div>
                <RemoveFolgaButton id={f.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
