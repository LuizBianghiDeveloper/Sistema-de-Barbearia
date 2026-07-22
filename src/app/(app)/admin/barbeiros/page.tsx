import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { AddBarberForm } from "@/components/admin/add-barber-form"
import { ToggleBarberButton } from "@/components/admin/toggle-barber-button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type BarberRow = {
  id: string
  ativo: boolean
  profile: { nome: string; email: string | null; telefone: string | null } | null
}

export default async function BarbeirosPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")
  if (profile.role !== "admin") redirect("/painel")

  const supabase = await createClient()
  const { data } = await supabase
    .from("barbers")
    .select("id, ativo, profile:profiles(nome, email, telefone)")
    .order("criado_em", { ascending: true })

  const barbers = (data ?? []) as unknown as BarberRow[]

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl">Barbeiros</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os profissionais que aparecem para agendamento.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 bg-card p-5">
        <h2 className="text-lg">Adicionar barbeiro</h2>
        <p className="text-sm text-muted-foreground">
          Informe o e-mail de um usuário já cadastrado para promovê-lo a barbeiro.
        </p>
        <AddBarberForm />
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        {barbers.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhum barbeiro cadastrado ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barbers.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    {b.profile?.nome ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div>{b.profile?.email ?? "—"}</div>
                    <div className="text-xs">{b.profile?.telefone ?? ""}</div>
                  </TableCell>
                  <TableCell>
                    {b.ativo ? (
                      <Badge>Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <ToggleBarberButton barberId={b.id} ativo={b.ativo} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
