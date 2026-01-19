import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">PASEKA IT CRM</h1>
          <p className="mt-2 text-gray-600">Войти или создать аккаунт</p>
        </div>

        <Suspense fallback={<div className="text-center text-gray-500">Загрузка...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
