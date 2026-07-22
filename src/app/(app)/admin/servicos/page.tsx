import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import {
  ServicoFormDialog,
  type Servico,
} from "@/components/admin/servico-form-dialog"
import { ToggleServicoButton } from "@/components/admin/toggle-servico-button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ServicoRow = Servico & { ativo: boolean }

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export default async function ServicosPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")
  if (profile.role !== "admin") redirect("/painel")

  const supabase = await createClient()
  const { data } = await supabase
    .from("services")
    .select("id, nome, duracao_min, preco, ativo")
    .order("nome")

  const servicos = (data ?? []) as ServicoRow[]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl">Serviços</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de serviços com duração e preço.
          </p>
        </div>
        <ServicoFormDialog />
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        {servicos.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhum serviço cadastrado ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicos.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.duracao_min} min
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {brl.format(s.preco)}
                  </TableCell>
                  <TableCell>
                    {s.ativo ? (
                      <Badge>Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <ServicoFormDialog servico={s} />
                    <ToggleServicoButton id={s.id} ativo={s.ativo} />
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
