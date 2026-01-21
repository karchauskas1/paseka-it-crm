'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import { useToast } from '@/lib/hooks/use-toast'
import { sourceLabels, statusLabels } from '@/lib/validations/client'
import { AppLayout } from '@/components/layout'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Pencil,
  FolderKanban,
  Calendar,
  FileText,
  Trash2,
  Sparkles,
  Loader2,
} from 'lucide-react'

interface ClientDetailClientProps {
  user: any
  workspace: any
  client: any
}

export default function ClientDetailClient({
  user,
  workspace,
  client: initialClient,
}: ClientDetailClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [client, setClient] = useState(initialClient)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: client.name,
    company: client.company || '',
    email: client.email || '',
    phone: client.phone || '',
    source: client.source,
    status: client.status,
    notes: client.notes || '',
  })

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Имя клиента обязательно',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка сохранения')
      }

      const updatedClient = await res.json()
      setClient({ ...client, ...updatedClient })
      setIsEditing(false)
      toast({
        title: 'Сохранено',
        description: 'Данные клиента обновлены',
        variant: 'success',
      })
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка удаления')
      }

      toast({
        title: 'Удалено',
        description: 'Клиент удалён',
        variant: 'success',
      })
      router.push('/clients')
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success'
      case 'INACTIVE':
        return 'warning'
      case 'ARCHIVED':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true)
    setAiAnalysis(null)
    try {
      const res = await fetch('/api/ai/analyze-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка AI анализа')
      }

      const data = await res.json()
      setAiAnalysis(data.analysis)
      // Update client state so it persists in local state
      setClient({
        ...client,
        aiAnalysis: data.analysis,
        aiAnalyzedAt: new Date().toISOString(),
      })
      toast({
        title: 'Анализ завершён и сохранён',
        description: 'AI проанализировал клиента',
        variant: 'success',
      })
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/clients" userRole={user.role}>
      {/* Breadcrumb */}
      <div className="mb-6">
          <Link
            href="/clients"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад к клиентам
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Client Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-2xl">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
                    {client.company && (
                      <p className="text-gray-600 flex items-center mt-1">
                        <Building2 className="h-4 w-4 mr-1" />
                        {client.company}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(client.status)}>
                    {statusLabels[client.status]}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Редактировать
                  </Button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium">
                      {client.email || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Телефон</p>
                    <p className="text-sm font-medium">
                      {client.phone || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Source & Created */}
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div>
                  <span className="font-medium">Источник:</span>{' '}
                  {sourceLabels[client.source]}
                </div>
                <div>
                  <span className="font-medium">Добавлен:</span>{' '}
                  {new Date(client.createdAt).toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-gray-400" />
                Заметки
              </h3>
              {client.notes ? (
                <p className="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              ) : (
                <p className="text-gray-400 italic">Нет заметок</p>
              )}
            </div>

            {/* Projects */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <FolderKanban className="h-5 w-5 mr-2 text-gray-400" />
                  Проекты клиента
                </h3>
                <Link href={`/projects/new?clientId=${client.id}`}>
                  <Button size="sm">Создать проект</Button>
                </Link>
              </div>

              {client.projects.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Нет проектов с этим клиентом
                </p>
              ) : (
                <div className="space-y-3">
                  {client.projects.map((project: any) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block p-4 rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {project.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {project._count.tasks} задач
                          </p>
                        </div>
                        <Badge variant="secondary">{project.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Статистика</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Проектов</span>
                  <span className="font-semibold">{client.projects.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Активных</span>
                  <span className="font-semibold">
                    {client.projects.filter((p: any) => p.status === 'IN_PROGRESS').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Завершённых</span>
                  <span className="font-semibold">
                    {client.projects.filter((p: any) => p.status === 'COMPLETED').length}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
                AI Анализ
              </h3>
              {/* Show saved analysis info if available */}
              {client.aiAnalyzedAt && !aiAnalysis && (
                <div className="text-xs text-gray-500 mb-2">
                  {client.aiAnalysis?.generatedByName && (
                    <span className="block">Автор: {client.aiAnalysis.generatedByName}</span>
                  )}
                  <span>
                    {new Date(client.aiAnalyzedAt).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">
                {(aiAnalysis || client.aiAnalysis) ? 'Обновите анализ для получения свежих рекомендаций' : 'Получите AI-рекомендации по работе с этим клиентом'}
              </p>
              <Button
                onClick={handleAiAnalysis}
                disabled={isAnalyzing}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Анализирую...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {(aiAnalysis || client.aiAnalysis) ? 'Обновить анализ' : 'Запросить анализ'}
                  </>
                )}
              </Button>
              {/* Show fresh analysis first, then saved one */}
              {(aiAnalysis || client.aiAnalysis) && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {aiAnalysis || (typeof client.aiAnalysis === 'string' ? client.aiAnalysis : client.aiAnalysis?.text)}
                  </p>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-600">
                Опасная зона
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Удаление клиента невозможно отменить. Все связанные данные будут
                удалены.
              </p>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить клиента
              </Button>
            </div>
          </div>
        </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Редактировать клиента</DialogTitle>
            <DialogDescription>
              Измените информацию о клиенте
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Имя *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">Компания</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Источник</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) =>
                    setFormData({ ...formData, source: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sourceLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Статус</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Заметки</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить клиента?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить клиента "{client.name}"? Это
              действие невозможно отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
