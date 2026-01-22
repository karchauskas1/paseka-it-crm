'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppLayout } from '@/components/layout'
import { useToast } from '@/lib/hooks/use-toast'
import { User, Bell, Lock, Loader2 } from 'lucide-react'

interface ProfileClientProps {
  user: any
  workspace: any
}

export default function ProfileClient({ user, workspace }: ProfileClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [profile, setProfile] = useState({
    name: user.name || '',
    email: user.email || '',
    telegramId: user.telegramId || '',
    language: user.language || 'ru',
  })

  const [notifications, setNotifications] = useState({
    taskAssigned: true,
    taskDueSoon: true,
    projectStatusChanged: true,
    commentAdded: true,
    mention: true,
    ...((user.notificationSettings as any) || {}),
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          telegramId: profile.telegramId || null,
          language: profile.language,
          notificationSettings: notifications,
        }),
      })

      if (!res.ok) throw new Error('Ошибка сохранения')
      toast({ title: 'Профиль сохранён', variant: 'success' })
      router.refresh()
    } catch (error) {
      toast({ title: 'Ошибка сохранения профиля', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Пароли не совпадают', variant: 'destructive' })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast({ title: 'Пароль должен быть минимум 6 символов', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ошибка изменения пароля')
      }

      toast({ title: 'Пароль изменён', variant: 'success' })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/profile" userRole={user.role}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Настройки профиля</h2>
        <p className="text-sm text-muted-foreground mt-1">Управление вашим аккаунтом</p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Profile Section */}
        <div className="bg-card rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">Основная информация</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label className="text-sm">Имя</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Email</Label>
              <Input
                value={profile.email}
                disabled
                className="mt-1 bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Email нельзя изменить</p>
            </div>
            <div>
              <Label className="text-sm">Telegram ID</Label>
              <Input
                value={profile.telegramId}
                onChange={(e) => setProfile({ ...profile, telegramId: e.target.value })}
                placeholder="@username или числовой ID"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Язык</Label>
              <Select
                value={profile.language}
                onValueChange={(v) => setProfile({ ...profile, language: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Роль в системе</p>
                <p className="text-sm text-muted-foreground">{getRoleLabel(user.role)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Workspace</p>
                <p className="text-sm text-muted-foreground">{workspace.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-card rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">Уведомления</h3>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <NotificationToggle
              label="Назначение задачи"
              description="Когда вам назначают задачу"
              checked={notifications.taskAssigned}
              onChange={(checked) => setNotifications({ ...notifications, taskAssigned: checked })}
            />
            <NotificationToggle
              label="Приближающийся дедлайн"
              description="За день до срока задачи"
              checked={notifications.taskDueSoon}
              onChange={(checked) => setNotifications({ ...notifications, taskDueSoon: checked })}
            />
            <NotificationToggle
              label="Изменение статуса проекта"
              description="Когда статус проекта изменяется"
              checked={notifications.projectStatusChanged}
              onChange={(checked) => setNotifications({ ...notifications, projectStatusChanged: checked })}
            />
            <NotificationToggle
              label="Новый комментарий"
              description="Когда добавляют комментарий к вашей задаче"
              checked={notifications.commentAdded}
              onChange={(checked) => setNotifications({ ...notifications, commentAdded: checked })}
            />
            <NotificationToggle
              label="Упоминания"
              description="Когда вас упоминают в комментарии"
              checked={notifications.mention}
              onChange={(checked) => setNotifications({ ...notifications, mention: checked })}
            />
          </div>
        </div>

        {/* Password Section */}
        <div className="bg-card rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">Изменить пароль</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <Label className="text-sm">Текущий пароль</Label>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Новый пароль</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <Label className="text-sm">Подтверждение</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="mt-4">
            <Button
              onClick={handleChangePassword}
              variant="outline"
              size="sm"
              disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword}
              className="w-full sm:w-auto"
            >
              Изменить пароль
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
            Выйти из системы
          </Button>
          <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить изменения'
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 touch-manipulation">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    VIEWER: 'Наблюдатель',
    MEMBER: 'Участник',
    ADMIN: 'Администратор',
    OWNER: 'Владелец',
  }
  return labels[role] || role
}
