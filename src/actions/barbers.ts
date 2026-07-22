"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getSessionProfile } from "@/lib/auth"

export type ActionResult = { error: string } | { success: string }

const emailSchema = z.string().trim().email("E-mail inválido.")

/** Promove um usuário existente a barbeiro (cria o vínculo de agenda). */
export async function addBarberByEmailAction(email: string): Promise<ActionResult> {
  const admin = await getSessionProfile()
  if (admin?.role !== "admin") return { error: "Acesso negado." }

  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("email", parsed.data)
    .maybeSingle()

  if (!profile) {
    return {
      error:
        "Nenhum usuário com esse e-mail. Peça para a pessoa criar uma conta primeiro.",
    }
  }

  const { data: jaBarbeiro } = await supabase
    .from("barbers")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle()

  if (jaBarbeiro) return { error: "Este usuário já é um barbeiro." }

  // Não rebaixa um admin; apenas promove clientes a barbeiro.
  if (profile.role === "client") {
    const { error: roleErr } = await supabase
      .from("profiles")
      .update({ role: "barber" })
      .eq("id", profile.id)
    if (roleErr) return { error: "Não foi possível atualizar o papel do usuário." }
  }

  const { error: insErr } = await supabase
    .from("barbers")
    .insert({ profile_id: profile.id, ativo: true })

  if (insErr) return { error: "Não foi possível cadastrar o barbeiro." }

  revalidatePath("/admin/barbeiros")
  return { success: "Barbeiro cadastrado com sucesso." }
}

/** Ativa ou desativa um barbeiro (desativado não recebe novos agendamentos). */
export async function toggleBarberAtivoAction(
  barberId: string,
  ativo: boolean
): Promise<ActionResult> {
  const admin = await getSessionProfile()
  if (admin?.role !== "admin") return { error: "Acesso negado." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("barbers")
    .update({ ativo })
    .eq("id", barberId)

  if (error) return { error: "Não foi possível atualizar o status." }

  revalidatePath("/admin/barbeiros")
  return { success: ativo ? "Barbeiro ativado." : "Barbeiro desativado." }
}
