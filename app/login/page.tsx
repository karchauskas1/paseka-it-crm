import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 bg-card rounded-lg shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">PASEKA IT CRM</h1>
          <p className="mt-2 text-muted-foreground">Войти или создать аккаунт</p>
        </div>

        <Suspense fallback={<div className="text-center text-muted-foreground">Загрузка...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
