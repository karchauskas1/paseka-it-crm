'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Monitor,
  UserPlus,
  Copy,
  Check,
  Users,
  Crown,
  MessageSquare,
  Bug,
  Lightbulb,
  List,
  PanelLeft,
  PanelTop,
} from 'lucide-react'
import { toast } from 'sonner'

interface UserMenuProps {
  user: {
    name: string
    email: string
  }
  workspace: {
    name: string
    id: string
  }
  userRole?: string
}

interface Invite {
  id: string
  token: string
  email: string | null
  role: string
  expiresAt: string
  usedAt: string | null
  inviteUrl?: string
}

export function UserMenu({ user, workspace, userRole }: UserMenuProps) {
  const router = useRouter()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [navLayout, setNavLayout] = useState<'top' | 'sidebar'>('top')
  const [invitesOpen, setInvitesOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'BUG' | 'FEATURE' | 'OTHER'>('BUG')
  const [feedbackText, setFeedbackText] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [newInvite, setNewInvite] = useState({ role: 'MEMBER' })
  const [isCreating, setIsCreating] = useState(false)
  const [justCreatedInvite, setJustCreatedInvite] = useState<Invite | null>(null)

  const isAdminOrOwner = userRole === 'ADMIN' || userRole === 'OWNER'

  useEffect(() => {
    // Загружаем тему из localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    }

    // Загружаем настройку навигации
    const savedNavLayout = localStorage.getItem('navLayout') as 'top' | 'sidebar' | null
    if (savedNavLayout) {
      setNavLayout(savedNavLayout)
      // Dispatch event для обновления layout
      window.dispatchEvent(new CustomEvent('navLayoutChange', { detail: savedNavLayout }))
    }
  }, [])

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(newTheme)
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
    toast.success(`Тема изменена на ${newTheme === 'light' ? 'светлую' : newTheme === 'dark' ? 'тёмную' : 'системную'}`)
  }

  const handleNavLayoutChange = (newLayout: 'top' | 'sidebar') => {
    setNavLayout(newLayout)
    localStorage.setItem('navLayout', newLayout)
    window.dispatchEvent(new CustomEvent('navLayoutChange', { detail: newLayout }))
    toast.success(`Навигация изменена на ${newLayout === 'top' ? 'верхнюю панель' : 'боковое меню'}`)
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error('Введите текст сообщения')
      return
    }

    setIsSubmittingFeedback(true)
    try {
      // Создаём заголовок из первых слов сообщения
      const title = feedbackText.trim().split('\n')[0].slice(0, 100) || 'Обратная связь'

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          title: title,
          description: feedbackText.trim(),
          workspaceId: workspace.id,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка отправки')
      }

      toast.success('Спасибо за обратную связь!')
      setFeedbackDialogOpen(false)
      setFeedbackText('')
      setFeedbackType('BUG')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось отправить сообщение')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/invites')
      if (res.ok) {
        const data = await res.json()
        setInvites(data)
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error)
    }
  }

  const handleCreateInvite = async () => {
    setIsCreating(true)
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvite),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка создания приглашения')
      }

      const invite = await res.json()
      setInvites([invite, ...invites])
      setNewInvite({ role: 'MEMBER' })
      setJustCreatedInvite(invite)
      toast.success('Приглашение создано')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsCreating(false)
    }
  }

  const copyInviteUrl = async (invite: Invite) => {
    const url = invite.inviteUrl || `${window.location.origin}/login?invite=${invite.token}`

    try {
      // Попытка использовать современный Clipboard API
      await navigator.clipboard.writeText(url)
      setCopiedToken(invite.token)
      toast.success('Ссылка скопирована в буфер обмена')
    } catch (err) {
      // Fallback: Создание временного textarea
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()

      try {
        const successful = document.execCommand('copy')
        if (successful) {
          setCopiedToken(invite.token)
          toast.success('Ссылка скопирована в буфер обмена')
        } else {
          // Если не удалось скопировать - показать ссылку
          toast.info(url, { duration: 10000 })
        }
      } catch (fallbackErr) {
        // Показать ссылку в toast для ручного копирования
        toast.info(`Скопируйте ссылку: ${url}`, { duration: 10000 })
      } finally {
        document.body.removeChild(textarea)
      }
    }

    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleDeleteInvite = async (token: string) => {
    try {
      const res = await fetch(`/api/invites/${token}`, { method: 'DELETE' })
      if (res.ok) {
        setInvites(invites.filter((i) => i.token !== token))
        toast.success('Приглашение удалено')
      }
    } catch (error) {
      toast.error('Ошибка удаления приглашения')
    }
  }

  const handleInvitesOpen = () => {
    setInvitesOpen(true)
    fetchInvites()
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      OWNER: { text: 'Владелец', color: 'bg-purple-100 text-purple-800' },
      ADMIN: { text: 'Админ', color: 'bg-blue-100 text-blue-800' },
      MEMBER: { text: 'Участник', color: 'bg-green-100 text-green-800' },
      VIEWER: { text: 'Наблюдатель', color: 'bg-gray-100 text-gray-800' },
    }
    return badges[role as keyof typeof badges] || badges.MEMBER
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-600 text-white">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user.name}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
              {userRole && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full w-fit ${getRoleBadge(userRole).color}`}
                >
                  {getRoleBadge(userRole).text}
                </span>
              )}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <User className="mr-2 h-4 w-4" />
            Профиль
          </DropdownMenuItem>

          {isAdminOrOwner && (
            <DropdownMenuItem onClick={handleInvitesOpen}>
              <UserPlus className="mr-2 h-4 w-4" />
              Приглашения
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => router.push('/team')}>
            <Users className="mr-2 h-4 w-4" />
            Команда
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {theme === 'light' && <Sun className="mr-2 h-4 w-4" />}
              {theme === 'dark' && <Moon className="mr-2 h-4 w-4" />}
              {theme === 'system' && <Monitor className="mr-2 h-4 w-4" />}
              Тема
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => handleThemeChange('light')}>
                <Sun className="mr-2 h-4 w-4" />
                Светлая
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                Тёмная
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleThemeChange('system')}>
                <Monitor className="mr-2 h-4 w-4" />
                Системная
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {navLayout === 'top' && <PanelTop className="mr-2 h-4 w-4" />}
              {navLayout === 'sidebar' && <PanelLeft className="mr-2 h-4 w-4" />}
              Навигация
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => handleNavLayoutChange('top')}>
                <PanelTop className="mr-2 h-4 w-4" />
                Верхняя панель
                {navLayout === 'top' && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavLayoutChange('sidebar')}>
                <PanelLeft className="mr-2 h-4 w-4" />
                Боковое меню
                {navLayout === 'sidebar' && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <MessageSquare className="mr-2 h-4 w-4" />
              Обратная связь
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => { setFeedbackType('BUG'); setFeedbackDialogOpen(true) }}>
                <Bug className="mr-2 h-4 w-4" />
                Сообщить о баге
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFeedbackType('FEATURE'); setFeedbackDialogOpen(true) }}>
                <Lightbulb className="mr-2 h-4 w-4" />
                Предложение
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/feedback')}>
                <List className="mr-2 h-4 w-4" />
                Открыть список
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {isAdminOrOwner && (
            <DropdownMenuItem onClick={() => router.push('/admin')}>
              <Settings className="mr-2 h-4 w-4" />
              Настройки
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleLogout} className="text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Диалог приглашений */}
      <Dialog open={invitesOpen} onOpenChange={setInvitesOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Приглашения в команду</DialogTitle>
            <DialogDescription>
              Создавайте приглашения для новых участников команды
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Создание нового приглашения */}
            <div className="border rounded-lg p-4 bg-secondary/50">
              <h3 className="font-medium mb-3">Создать приглашение</h3>
              <div className="space-y-3">
                <div>
                  <Label>Роль</Label>
                  <Select
                    value={newInvite.role}
                    onValueChange={(role) => setNewInvite({ role })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">Наблюдатель</SelectItem>
                      <SelectItem value="MEMBER">Участник</SelectItem>
                      {userRole === 'OWNER' && <SelectItem value="ADMIN">Админ</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateInvite} disabled={isCreating} className="w-full">
                  {isCreating ? 'Создание...' : 'Создать ссылку-приглашение'}
                </Button>

                {/* Показываем только что созданную ссылку */}
                {justCreatedInvite && (
                  <div className="mt-3 p-3 bg-background border rounded-lg">
                    <Label className="text-xs mb-2 block">Ссылка-приглашение создана:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={justCreatedInvite.inviteUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${justCreatedInvite.token}`}
                        className="text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyInviteUrl(justCreatedInvite)}
                      >
                        {copiedToken === justCreatedInvite.token ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Список приглашений */}
            <div>
              <h3 className="font-medium mb-3">Активные приглашения</h3>
              <div className="space-y-2">
                {invites.filter((i) => !i.usedAt).length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Нет активных приглашений
                  </p>
                ) : (
                  invites
                    .filter((i) => !i.usedAt)
                    .map((invite) => (
                      <div key={invite.id} className="border rounded-lg p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(invite.role).color}`}>
                              {getRoleBadge(invite.role).text}
                            </span>
                            {invite.email && (
                              <span className="text-sm text-gray-600">{invite.email}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Истекает: {new Date(invite.expiresAt).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteUrl(invite)}
                          >
                            {copiedToken === invite.token ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInvite(invite.token)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Удалить
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог профиля */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Настройки профиля</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Имя</Label>
              <Input value={user.name} disabled />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <div>
              <Label>Команда</Label>
              <Input value={workspace.name} disabled />
            </div>
            <p className="text-sm text-gray-500">
              Для изменения данных профиля обратитесь к администратору
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог обратной связи */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {feedbackType === 'BUG' ? 'Сообщить о баге' : 'Предложение'}
            </DialogTitle>
            <DialogDescription>
              {feedbackType === 'BUG'
                ? 'Опишите проблему, с которой вы столкнулись'
                : 'Поделитесь вашими идеями по улучшению системы'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Тип</Label>
              <Select
                value={feedbackType}
                onValueChange={(value) => setFeedbackType(value as 'BUG' | 'FEATURE' | 'OTHER')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUG">Баг / Ошибка</SelectItem>
                  <SelectItem value="FEATURE">Предложение / Идея</SelectItem>
                  <SelectItem value="OTHER">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Сообщение</Label>
              <textarea
                className="w-full min-h-[120px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={feedbackType === 'BUG'
                  ? 'Опишите шаги для воспроизведения бага...'
                  : 'Опишите вашу идею...'}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSubmitFeedback} disabled={isSubmittingFeedback}>
                {isSubmittingFeedback ? 'Отправка...' : 'Отправить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
