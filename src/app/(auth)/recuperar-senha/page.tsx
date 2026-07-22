import Link from "next/link"
import { AuthCard } from "@/components/auth/auth-card"
import { RecuperarSenhaForm } from "@/components/auth/recuperar-senha-form"

export default function RecuperarSenhaPage() {
  return (
    <AuthCard
      title="Recuperar senha"
      description="Enviaremos um link para você redefinir sua senha."
      footer={
        <p>
          <Link href="/login" className="text-primary hover:underline">
            Voltar para o login
          </Link>
        </p>
      }
    >
      <RecuperarSenhaForm />
    </AuthCard>
  )
}
