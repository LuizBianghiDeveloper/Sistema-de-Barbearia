import { redirect } from "next/navigation"
import { Brand } from "@/components/brand"
import { getSessionProfile } from "@/lib/auth"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getSessionProfile()
  if (profile) redirect("/painel")

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Brand href="/" size="lg" />
      <div className="w-full max-w-sm">{children}</div>
      <div className="space-y-1 text-center text-xs text-muted-foreground">
        <p>Lucas Simões Barbearia</p>
        <p>
          Desenvolvido por{" "}
          <span className="font-medium text-foreground/80">
            Bianghi Innovations
          </span>
        </p>
      </div>
    </div>
  )
}
