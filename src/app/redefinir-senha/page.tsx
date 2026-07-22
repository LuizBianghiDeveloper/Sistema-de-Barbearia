import { Brand } from "@/components/brand"
import { AuthCard } from "@/components/auth/auth-card"
import { RedefinirSenhaForm } from "@/components/auth/redefinir-senha-form"

export default function RedefinirSenhaPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Brand href="/" size="lg" />
      <div className="w-full max-w-sm">
        <AuthCard
          title="Definir nova senha"
          description="Escolha uma nova senha para sua conta."
        >
          <RedefinirSenhaForm />
        </AuthCard>
      </div>
    </div>
  )
}
