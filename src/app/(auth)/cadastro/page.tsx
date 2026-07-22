import Link from "next/link"
import { AuthCard } from "@/components/auth/auth-card"
import { CadastroForm } from "@/components/auth/cadastro-form"

export default function CadastroPage() {
  return (
    <AuthCard
      title="Criar conta"
      description="Cadastre-se para agendar seus horários."
      footer={
        <p>
          Já tem conta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      }
    >
      <CadastroForm />
    </AuthCard>
  )
}
