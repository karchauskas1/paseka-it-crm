'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, User, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface UserProfileModalProps {
  userId: string | null
  isOpen: boolean
  onClose: () => void
}

interface UserProfile {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  createdAt: string
  isOnline: boolean
  lastSeenAt: string | null
}

export function UserProfileModal({
  userId,
  isOpen,
  onClose,
}: UserProfileModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (!isOpen || !userId) {
      setUser(null)
      return
    }

    const fetchUser = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/users/${userId}/profile`)

        if (!response.ok) {
          throw new Error('Failed to fetch')
        }

        const data = await response.json()
        setUser(data)
      } catch (err) {
        setError('Не удалось загрузить профиль')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [isOpen, userId])

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }
    return email.substring(0, 2).toUpperCase()
  }

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      OWNER: 'Владелец',
      ADMIN: 'Администратор',
      MEMBER: 'Участник',
      GUEST: 'Гость',
    }
    return roles[role] || role
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Профиль пользователя
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-muted-foreground">{error}</div>
          )}

          {!loading && !error && user && (
            <div className="space-y-6">
              {/* Avatar and name */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user.image || undefined} alt={user.name || ''} />
                    <AvatarFallback className="text-lg">
                      {getInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <span
                    className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background ${
                      user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>
                <h3 className="mt-3 font-semibold text-lg">
                  {user.name || 'Без имени'}
                </h3>
                <Badge variant="secondary" className="mt-1">
                  {getRoleLabel(user.role)}
                </Badge>
              </div>

              {/* User info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                </div>

                <div className="flex items-center gap-3 px-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {user.isOnline ? (
                      <span className="text-green-600 font-medium">Онлайн</span>
                    ) : user.lastSeenAt ? (
                      `Был(а) ${format(new Date(user.lastSeenAt), 'dd MMM в HH:mm', { locale: ru })}`
                    ) : (
                      'Не в сети'
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
