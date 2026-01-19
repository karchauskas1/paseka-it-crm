'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Users,
  Settings,
  Bot,
  Plus,
  Pencil,
  Trash2,
  Shield,
  User,
  Building2,
  FolderKanban,
  UserCheck,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Copy,
  Crown,
  Mail,
} from 'lucide-react'
import { toast } from 'sonner'

interface AdminClientProps {
  user: any
  workspace: any
  users: any[]
}

const roleLabels: Record<string, string> = {
  OWNER: 'Владелец',
  ADMIN: 'Администратор',
  MEMBER: 'Сотрудник',
  VIEWER: 'Наблюдатель',
}

interface Invite {
  id: string
  email: string | null
  token: string
  role: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
  createdBy: { name: string }
}

export default function AdminClient({
  user,
  workspace,
  users: initialUsers,
}: AdminClientProps) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [workspaceSettings, setWorkspaceSettings] = useState({
    name: workspace.name,
    telegramBotToken: workspace.telegramBotToken || '',
    telegramChatId: workspace.telegramChatId || '',
    openRouterApiKey: workspace.openRouterApiKey || '',
  })

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MEMBER',
  })

  // Invite states
  const [invites, setInvites] = useState<Invite[]>([])
  const [isCreateInviteOpen, setIsCreateInviteOpen] = useState(false)
  const [newInvite, setNewInvite] = useState({ email: '', role: 'MEMBER' })
  const [createdInviteUrl, setCreatedInviteUrl] = useState('')

  // Transfer ownership state
  const [isTransferOwnershipOpen, setIsTransferOwnershipOpen] = useState(false)
  const [newOwnerId, setNewOwnerId] = useState('')

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Ошибка', { description: 'Заполните все обязательные поля' })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка создания пользователя')
      }

      const createdUser = await res.json()
      setUsers([...users, { ...createdUser, _count: { tasks: 0, projects: 0 } }])
      setIsCreateUserOpen(false)
      setNewUser({ name: '', email: '', password: '', role: 'MEMBER' })
      toast.success('Пользователь создан', { description: createdUser.name })
    } catch (error: any) {
      toast.error('Ошибка', { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedUser.name,
          role: selectedUser.role,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка обновления пользователя')
      }

      const updatedUser = await res.json()
      setUsers(users.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u)))
      setIsEditUserOpen(false)
      setSelectedUser(null)
      toast.success('Пользователь обновлён', { description: updatedUser.name })
    } catch (error: any) {
      toast.error('Ошибка', { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка удаления пользователя')
      }

      setUsers(users.filter((u) => u.id !== userId))
      toast.success('Пользователь удалён')
    } catch (error: any) {
      toast.error('Ошибка', { description: error.message })
    }
  }

  const handleSaveWorkspaceSettings = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workspaceSettings),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка сохранения настроек')
      }

      toast.success('Настройки сохранены')
      router.refresh()
    } catch (error: any) {
      toast.error('Ошибка', { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const testTelegramConnection = async () => {
    if (!workspaceSettings.telegramBotToken || !workspaceSettings.telegramChatId) {
      toast.error('Ошибка', { description: 'Укажите токен бота и ID чата' })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: workspaceSettings.telegramBotToken,
          chatId: workspaceSettings.telegramChatId,
        }),
      })

      if (!res.ok) {
        throw new Error('Ошибка отправки тестового сообщения')
      }

      toast.success('Тестовое сообщение отправлено', { description: 'Проверьте Telegram' })
    } catch (error: any) {
      toast.error('Ошибка', { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch invites
  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/invites')
      if (res.ok) {
        const data = await res.json()
        setInvites(data)
      }
    } catch (error) {
      console.error('Error fetching invites:', error)
    }
  }

  // Create invite
  const handleCreateInvite = async () => {
    setIsLoading(true)
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
      setCreatedInviteUrl(invite.inviteUrl)
      setInvites([invite, ...invites])
      toast.success('Приглашение создано')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Delete invite
  const handleDeleteInvite = async (token: string) => {
    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Ошибка удаления приглашения')
      }

      setInvites(invites.filter((i) => i.token !== token))
      toast.success('Приглашение удалено')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // Copy invite link
  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Ссылка скопирована')
  }

  // Transfer ownership
  const handleTransferOwnership = async () => {
    if (!newOwnerId) return

    if (!confirm('Вы уверены? После передачи прав вы станете администратором.')) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/transfer-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка передачи прав')
      }

      toast.success('Права владельца переданы')
      setIsTransferOwnershipOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch invites on mount
  useEffect(() => {
    fetchInvites()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PASEKA IT CRM</h1>
              <p className="text-sm text-gray-600">{workspace.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{user.name}</span>
              <Badge variant="info">
                <Shield className="h-3 w-3 mr-1" />
                Админ
              </Badge>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/dashboard"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Dashboard
            </Link>
            <Link
              href="/projects"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Проекты
            </Link>
            <Link
              href="/clients"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Клиенты
            </Link>
            <Link
              href="/tasks"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Задачи
            </Link>
            <Link
              href="/admin"
              className="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600"
            >
              Администрирование
            </Link>
            <Link
              href="/guide"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Гайд
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Администрирование</h2>
          <p className="mt-1 text-sm text-gray-600">
            Управление пользователями, настройками и интеграциями
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Пользователи</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {workspace._count.users}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FolderKanban className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Проекты</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {workspace._count.projects}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Клиенты</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {workspace._count.clients}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="invites">
              <Mail className="h-4 w-4 mr-2" />
              Приглашения
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Настройки
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Bot className="h-4 w-4 mr-2" />
              Интеграции
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">Пользователи workspace</h3>
                <Button onClick={() => setIsCreateUserOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </div>
              <div className="divide-y">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {u.role === 'ADMIN' ? (
                          <Shield className="h-5 w-5 text-gray-600" />
                        ) : (
                          <User className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {u.name}
                          {u.id === user.id && (
                            <span className="ml-2 text-sm text-gray-500">(вы)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm text-gray-500">
                        <p>{u._count.projects} проектов</p>
                        <p>{u._count.tasks} задач</p>
                      </div>
                      <Badge variant={u.role === 'ADMIN' ? 'info' : 'default'}>
                        {roleLabels[u.role]}
                      </Badge>
                      {u.id !== user.id && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u)
                              setIsEditUserOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(u.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">Приглашения</h3>
                <Button onClick={() => {
                  setCreatedInviteUrl('')
                  setNewInvite({ email: '', role: 'MEMBER' })
                  setIsCreateInviteOpen(true)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать приглашение
                </Button>
              </div>
              <div className="p-4">
                {invites.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Нет активных приглашений</p>
                ) : (
                  <div className="space-y-3">
                    {invites.filter(i => !i.usedAt && new Date(i.expiresAt) > new Date()).map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <LinkIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {invite.email || 'Без email (любой может использовать)'}
                            </p>
                            <p className="text-sm text-gray-500">
                              Роль: {roleLabels[invite.role]} • Создал: {invite.createdBy.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              Истекает: {new Date(invite.expiresAt).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteLink(invite.token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteInvite(invite.token)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Настройки workspace</h3>
              <div className="space-y-4 max-w-md">
                <div className="grid gap-2">
                  <Label htmlFor="workspaceName">Название workspace</Label>
                  <Input
                    id="workspaceName"
                    value={workspaceSettings.name}
                    onChange={(e) =>
                      setWorkspaceSettings({ ...workspaceSettings, name: e.target.value })
                    }
                  />
                </div>
                <Button onClick={handleSaveWorkspaceSettings} disabled={isLoading}>
                  {isLoading ? 'Сохранение...' : 'Сохранить настройки'}
                </Button>
              </div>

              {/* Transfer Ownership - only for OWNER */}
              {user.role === 'OWNER' && (
                <div className="mt-8 pt-6 border-t">
                  <h4 className="text-lg font-semibold mb-4 text-red-600 flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    Передача прав владельца
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Передача прав владельца другому пользователю. После передачи вы станете администратором.
                    Это действие нельзя отменить без участия нового владельца.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setIsTransferOwnershipOpen(true)}
                  >
                    Передать права владельца
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <div className="space-y-6">
              {/* Telegram Integration */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Bot className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Telegram</h3>
                    <p className="text-sm text-gray-500">Уведомления в Telegram</p>
                  </div>
                  {workspace.telegramBotToken && workspace.telegramChatId ? (
                    <Badge variant="success" className="ml-auto">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Настроено
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="ml-auto">
                      <XCircle className="h-3 w-3 mr-1" />
                      Не настроено
                    </Badge>
                  )}
                </div>
                <div className="space-y-4 max-w-md">
                  <div className="grid gap-2">
                    <Label htmlFor="telegramBotToken">Bot Token</Label>
                    <div className="relative">
                      <Input
                        id="telegramBotToken"
                        type={showPassword ? 'text' : 'password'}
                        value={workspaceSettings.telegramBotToken}
                        onChange={(e) =>
                          setWorkspaceSettings({
                            ...workspaceSettings,
                            telegramBotToken: e.target.value,
                          })
                        }
                        placeholder="123456:ABC-DEF..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Получите токен у @BotFather в Telegram
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telegramChatId">Chat ID</Label>
                    <Input
                      id="telegramChatId"
                      value={workspaceSettings.telegramChatId}
                      onChange={(e) =>
                        setWorkspaceSettings({
                          ...workspaceSettings,
                          telegramChatId: e.target.value,
                        })
                      }
                      placeholder="-1001234567890"
                    />
                    <p className="text-xs text-gray-500">
                      ID чата или группы для уведомлений
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveWorkspaceSettings} disabled={isLoading}>
                      Сохранить
                    </Button>
                    <Button
                      variant="outline"
                      onClick={testTelegramConnection}
                      disabled={isLoading}
                    >
                      Тест
                    </Button>
                  </div>
                </div>
              </div>

              {/* AI Integration */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <UserCheck className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">AI Ассистент</h3>
                    <p className="text-sm text-gray-500">OpenRouter API для AI функций</p>
                  </div>
                  {workspace.openRouterApiKey ? (
                    <Badge variant="success" className="ml-auto">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Настроено
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="ml-auto">
                      <XCircle className="h-3 w-3 mr-1" />
                      Не настроено
                    </Badge>
                  )}
                </div>
                <div className="space-y-4 max-w-md">
                  <div className="grid gap-2">
                    <Label htmlFor="openRouterApiKey">OpenRouter API Key</Label>
                    <div className="relative">
                      <Input
                        id="openRouterApiKey"
                        type={showPassword ? 'text' : 'password'}
                        value={workspaceSettings.openRouterApiKey}
                        onChange={(e) =>
                          setWorkspaceSettings({
                            ...workspaceSettings,
                            openRouterApiKey: e.target.value,
                          })
                        }
                        placeholder="sk-or-v1-..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Получите ключ на openrouter.ai
                    </p>
                  </div>
                  <Button onClick={handleSaveWorkspaceSettings} disabled={isLoading}>
                    Сохранить
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый пользователь</DialogTitle>
            <DialogDescription>
              Добавьте нового пользователя в workspace
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="userName">Имя *</Label>
              <Input
                id="userName"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Иван Петров"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="userEmail">Email *</Label>
              <Input
                id="userEmail"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="ivan@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="userPassword">Пароль *</Label>
              <Input
                id="userPassword"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Минимум 6 символов"
              />
            </div>
            <div className="grid gap-2">
              <Label>Роль</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Сотрудник</SelectItem>
                  <SelectItem value="ADMIN">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateUser} disabled={isLoading}>
              {isLoading ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать пользователя</DialogTitle>
            <DialogDescription>Изменение данных пользователя</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="editUserName">Имя</Label>
                <Input
                  id="editUserName"
                  value={selectedUser.name}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={selectedUser.email} disabled />
                <p className="text-xs text-gray-500">Email нельзя изменить</p>
              </div>
              <div className="grid gap-2">
                <Label>Роль</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value) =>
                    setSelectedUser({ ...selectedUser, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Сотрудник</SelectItem>
                    <SelectItem value="ADMIN">Администратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleUpdateUser} disabled={isLoading}>
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invite Dialog */}
      <Dialog open={isCreateInviteOpen} onOpenChange={setIsCreateInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать приглашение</DialogTitle>
            <DialogDescription>
              Создайте ссылку для приглашения нового участника
            </DialogDescription>
          </DialogHeader>
          {createdInviteUrl ? (
            <div className="py-4">
              <Label className="mb-2 block">Ссылка для приглашения:</Label>
              <div className="flex gap-2">
                <Input value={createdInviteUrl} readOnly />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(createdInviteUrl)
                    toast.success('Ссылка скопирована')
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Отправьте эту ссылку пользователю. Ссылка действительна 7 дней.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="inviteEmail">Email (опционально)</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={newInvite.email}
                  onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                  placeholder="user@example.com"
                />
                <p className="text-xs text-gray-500">
                  Если указан, только пользователь с этим email сможет использовать приглашение
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Роль</Label>
                <Select
                  value={newInvite.role}
                  onValueChange={(value) => setNewInvite({ ...newInvite, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">Наблюдатель</SelectItem>
                    <SelectItem value="MEMBER">Сотрудник</SelectItem>
                    {user.role === 'OWNER' && (
                      <SelectItem value="ADMIN">Администратор</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateInviteOpen(false)}>
              {createdInviteUrl ? 'Закрыть' : 'Отмена'}
            </Button>
            {!createdInviteUrl && (
              <Button onClick={handleCreateInvite} disabled={isLoading}>
                {isLoading ? 'Создание...' : 'Создать'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={isTransferOwnershipOpen} onOpenChange={setIsTransferOwnershipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Передача прав владельца
            </DialogTitle>
            <DialogDescription>
              После передачи прав вы станете администратором. Это действие нельзя отменить самостоятельно.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Выберите нового владельца</Label>
              <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите пользователя" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.id !== user.id)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferOwnershipOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleTransferOwnership}
              disabled={isLoading || !newOwnerId}
            >
              {isLoading ? 'Передача...' : 'Передать права'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
