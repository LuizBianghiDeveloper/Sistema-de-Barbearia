import Link from "next/link"
import { AuthCard } from "@/components/auth/auth-card"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <AuthCard
      title="Entrar"
      description="Acesse sua conta para agendar e gerenciar horários."
      footer={
        <div className="space-y-1">
          <p>
            Não tem conta?{" "}
            <Link href="/cadastro" className="text-primary hover:underline">
              Criar conta
            </Link>
          </p>
          <p>
            <Link
              href="/recuperar-senha"
              className="text-muted-foreground hover:underline"
            >
              Esqueci minha senha
            </Link>
          </p>
        </div>
      }
    >
      <LoginForm />
    </AuthCard>
  )
}
