import { getSessionProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatLocal } from "@/lib/time"
import {
  BookingWizard,
  type WizBarber,
  type WizService,
} from "@/components/agendar/booking-wizard"

export default async function AgendarPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")

  const supabase = await createClient()

  const [{ data: servicesData }, { data: barbersData }] = await Promise.all([
    supabase
      .from("services")
      .select("id, nome, duracao_min, preco")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("barbers")
      .select("id, profile:profiles(nome)")
      .eq("ativo", true)
      .order("criado_em", { ascending: true }),
  ])

  const services = (servicesData ?? []) as WizService[]
  const barbers = (
    (barbersData ?? []) as unknown as {
      id: string
      profile: { nome: string } | null
    }[]
  ).map<WizBarber>((b) => ({ id: b.id, nome: b.profile?.nome ?? "Barbeiro" }))

  // Hoje no fuso da barbearia (base para a lista de dias).
  const hoje = formatLocal(new Date(), "yyyy-MM-dd")

  return <BookingWizard services={services} barbers={barbers} hoje={hoje} />
}

export const metadata = { title: "Agendar — Barbearia" }
