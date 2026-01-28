'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Users, Building2, Shield, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface InviteClientProps {
  token: string
  workspace: {
    id: string
    name: string
  }
  role: string
  roleLabel: string
  invitedBy: string
  user: {
    id: string
    name: string
    email: string
  }
}

export default function InviteClient({
  token,
  workspace,
  role,
  roleLabel,
  invitedBy,
  user,
}: InviteClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка принятия приглашения')
      }

      setAccepted(true)
      toast.success('Приглашение принято!')

      // Перенаправляем через 2 секунды
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка принятия приглашения')
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = () => {
    router.push('/dashboard')
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="bg-card p-8 rounded-lg shadow max-w-md w-full text-center">
          <div className="h-16 w-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">Добро пожаловать!</h1>
          <p className="text-muted-foreground mb-2">Вы присоединились к команде {workspace.name}</p>
          <p className="text-sm text-muted-foreground">Перенаправление...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="bg-card p-8 rounded-lg shadow max-w-md w-full">
        <div className="text-center mb-6">
          <div className="h-16 w-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Приглашение в команду</h1>
          <p className="text-muted-foreground">
            {invitedBy} приглашает вас присоединиться к рабочему пространству
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Рабочее пространство</p>
              <p className="font-medium text-foreground">{workspace.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Ваша роль</p>
              <p className="font-medium text-foreground">{roleLabel}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 mb-6">
          <p className="text-sm text-muted-foreground">
            Вы войдёте как <span className="font-medium">{user.name}</span> ({user.email})
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDecline}
            disabled={loading}
          >
            Отклонить
          </Button>
          <Button className="flex-1" onClick={handleAccept} disabled={loading}>
            {loading ? 'Присоединение...' : 'Присоединиться'}
          </Button>
        </div>
      </div>
    </div>
  )
}
