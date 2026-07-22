"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionProfile } from "@/lib/auth"
import { servicoSchema, type ServicoInput } from "@/lib/validations/config"

export type ActionResult = { error: string } | { success: string }

async function assertAdmin(): Promise<string | null> {
  const p = await getSessionProfile()
  return p?.role === "admin" ? null : "Acesso negado."
}

export async function createServicoAction(values: ServicoInput): Promise<ActionResult> {
  const negado = await assertAdmin()
  if (negado) return { error: negado }

  const parsed = servicoSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from("services").insert(parsed.data)
  if (error) return { error: "Não foi possível criar o serviço." }

  revalidatePath("/admin/servicos")
  return { success: "Serviço criado." }
}

export async function updateServicoAction(
  id: string,
  values: ServicoInput
): Promise<ActionResult> {
  const negado = await assertAdmin()
  if (negado) return { error: negado }

  const parsed = servicoSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from("services")
    .update(parsed.data)
    .eq("id", id)
  if (error) return { error: "Não foi possível atualizar o serviço." }

  revalidatePath("/admin/servicos")
  return { success: "Serviço atualizado." }
}

export async function toggleServicoAtivoAction(
  id: string,
  ativo: boolean
): Promise<ActionResult> {
  const negado = await assertAdmin()
  if (negado) return { error: negado }

  const supabase = await createClient()
  const { error } = await supabase.from("services").update({ ativo }).eq("id", id)
  if (error) return { error: "Não foi possível atualizar o status." }

  revalidatePath("/admin/servicos")
  return { success: ativo ? "Serviço ativado." : "Serviço desativado." }
}
