'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [isLoading, setIsLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')

  // Режим регистрации: create или join
  const [registerMode, setRegisterMode] = useState<'create' | 'join'>(
    inviteToken ? 'join' : 'create'
  )

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    workspaceName: '',
    workspaceDescription: '',
    inviteToken: inviteToken || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (isRegister) {
        // Валидация
        if (registerMode === 'create' && !formData.workspaceName) {
          throw new Error('Название команды обязательно')
        }
        if (registerMode === 'join' && !formData.inviteToken) {
          throw new Error('Токен приглашения обязателен')
        }

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            action: registerMode,
            workspaceName: registerMode === 'create' ? formData.workspaceName : undefined,
            workspaceDescription:
              registerMode === 'create' ? formData.workspaceDescription : undefined,
            inviteToken: registerMode === 'join' ? formData.inviteToken : undefined,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Registration failed')
        }

        router.push('/dashboard')
        router.refresh()
      } else {
        // Логин
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Login failed')
        }

        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">PASEKA IT CRM</h1>
          <p className="mt-2 text-gray-600">
            {isRegister ? 'Создать аккаунт' : 'Войти в систему'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ваше имя"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <div className="pt-4">
                <Tabs value={registerMode} onValueChange={(v) => setRegisterMode(v as 'create' | 'join')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="create">Создать команду</TabsTrigger>
                    <TabsTrigger value="join">Присоединиться</TabsTrigger>
                  </TabsList>

                  <TabsContent value="create" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="workspaceName">Название команды *</Label>
                      <Input
                        id="workspaceName"
                        type="text"
                        required={registerMode === 'create'}
                        value={formData.workspaceName}
                        onChange={(e) =>
                          setFormData({ ...formData, workspaceName: e.target.value })
                        }
                        placeholder="Моя команда"
                      />
                    </div>

                    <div>
                      <Label htmlFor="workspaceDescription">Описание (опционально)</Label>
                      <Input
                        id="workspaceDescription"
                        type="text"
                        value={formData.workspaceDescription}
                        onChange={(e) =>
                          setFormData({ ...formData, workspaceDescription: e.target.value })
                        }
                        placeholder="Краткое описание команды"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="join" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="inviteToken">Токен приглашения *</Label>
                      <Input
                        id="inviteToken"
                        type="text"
                        required={registerMode === 'join'}
                        value={formData.inviteToken}
                        onChange={(e) =>
                          setFormData({ ...formData, inviteToken: e.target.value })
                        }
                        placeholder="Вставьте токен приглашения"
                        disabled={!!inviteToken}
                      />
                      {inviteToken && (
                        <p className="mt-1 text-xs text-green-600">
                          Токен получен из ссылки приглашения
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}

          {!isRegister && (
            <>
              <div>
                <Label htmlFor="email-login">Email</Label>
                <Input
                  id="email-login"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <Label htmlFor="password-login">Пароль</Label>
                <Input
                  id="password-login"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Загрузка...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister)
              setError('')
            }}
            className="w-full text-sm text-blue-600 hover:text-blue-800"
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  )
}
