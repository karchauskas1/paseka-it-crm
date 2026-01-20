'use client'

import { useState, useEffect } from 'react'
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
import { Layout } from '@/components/layout'
import { toast } from 'sonner'
import {
  Plus,
  Phone,
  Mail,
  Building2,
  User,
  Clock,
  MessageSquare,
  UserPlus,
  Pencil,
  Trash2,
  ArrowRight,
  CalendarClock,
  Sparkles,
  Loader2,
  AtSign,
} from 'lucide-react'

interface Touch {
  id: string
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
  contactCompany: string | null
  socialMedia: string | null
  source: string | null
  status: string
  description: string | null
  response: string | null
  contactedAt: string
  respondedAt: string | null
  followUpAt: string | null
  convertedToClientId: string | null
  createdBy: {
    id: string
    name: string
  }
}

interface TouchesClientProps {
  user: any
  workspace: any
  userRole: string
}

const statusLabels: Record<string, string> = {
  WAITING: 'Ждём ответа',
  RESPONDED: 'Ответил',
  NO_RESPONSE: 'Не ответил',
  FOLLOW_UP: 'Повторно связаться',
  CONVERTED: 'Конвертирован',
}

const statusColors: Record<string, string> = {
  WAITING: 'bg-yellow-100 text-yellow-800',
  RESPONDED: 'bg-green-100 text-green-800',
  NO_RESPONSE: 'bg-red-100 text-red-800',
  FOLLOW_UP: 'bg-blue-100 text-blue-800',
  CONVERTED: 'bg-purple-100 text-purple-800',
}

export default function TouchesClient({ user, workspace, userRole }: TouchesClientProps) {
  const router = useRouter()
  const [touches, setTouches] = useState<Touch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedTouch, setSelectedTouch] = useState<Touch | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<{ touchId: string; analysis: string } | null>(null)

  const [formData, setFormData] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactCompany: '',
    socialMedia: '',
    source: '',
    description: '',
    followUpAt: '',
    status: 'WAITING',
    response: '',
  })

  useEffect(() => {
    fetchTouches()
  }, [filterStatus])

  const fetchTouches = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/touches?status=${filterStatus}`)
      if (res.ok) {
        const data = await res.json()
        setTouches(data.touches)
      }
    } catch (error) {
      console.error('Error fetching touches:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactCompany: '',
      socialMedia: '',
      source: '',
      description: '',
      followUpAt: '',
      status: 'WAITING',
      response: '',
    })
  }

  const openCreateDialog = () => {
    resetForm()
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = (touch: Touch) => {
    setSelectedTouch(touch)
    setFormData({
      contactName: touch.contactName,
      contactEmail: touch.contactEmail || '',
      contactPhone: touch.contactPhone || '',
      contactCompany: touch.contactCompany || '',
      socialMedia: touch.socialMedia || '',
      source: touch.source || '',
      description: touch.description || '',
      followUpAt: touch.followUpAt ? touch.followUpAt.split('T')[0] : '',
      status: touch.status,
      response: touch.response || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleCreate = async () => {
    if (!formData.contactName.trim()) {
      toast.error('Укажите имя контакта')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/touches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка создания')
      }

      toast.success('Касание создано')
      setIsCreateDialogOpen(false)
      fetchTouches()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedTouch) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/touches/${selectedTouch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка обновления')
      }

      toast.success('Касание обновлено')
      setIsEditDialogOpen(false)
      fetchTouches()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить это касание?')) return

    try {
      const res = await fetch(`/api/touches/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Ошибка удаления')

      toast.success('Касание удалено')
      fetchTouches()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleConvert = async (touch: Touch) => {
    if (!confirm(`Конвертировать "${touch.contactName}" в клиента?`)) return

    try {
      const res = await fetch(`/api/touches/${touch.id}/convert`, {
        method: 'POST',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка конвертации')
      }

      const data = await res.json()
      toast.success(data.message)
      fetchTouches()
      router.push(`/clients/${data.client.id}`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleAiAnalysis = async (touchId: string) => {
    setIsAnalyzing(touchId)
    setAiAnalysis(null)
    try {
      const res = await fetch('/api/ai/analyze-touch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ touchId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка AI анализа')
      }

      const data = await res.json()
      setAiAnalysis({ touchId, analysis: data.analysis })
      toast.success('Анализ завершён')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsAnalyzing(null)
    }
  }

  return (
    <Layout user={user} workspace={workspace} userRole={userRole}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Касания</h1>
            <p className="text-sm text-gray-600">
              Отслеживание контактов и взаимодействий
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Новое касание
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <Label>Статус:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="WAITING">Ждём ответа</SelectItem>
                <SelectItem value="RESPONDED">Ответили</SelectItem>
                <SelectItem value="NO_RESPONSE">Не ответили</SelectItem>
                <SelectItem value="FOLLOW_UP">Повторно связаться</SelectItem>
                <SelectItem value="CONVERTED">Конвертированы</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Touches List */}
        <div className="bg-white rounded-lg shadow">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Загрузка...</div>
          ) : touches.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">Нет касаний</p>
              <Button onClick={openCreateDialog}>Создать первое касание</Button>
            </div>
          ) : (
            <div className="divide-y">
              {touches.map((touch) => (
                <div
                  key={touch.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {touch.contactName}
                        </h3>
                        <Badge className={statusColors[touch.status]}>
                          {statusLabels[touch.status]}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2 flex-wrap">
                        {touch.contactCompany && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {touch.contactCompany}
                          </span>
                        )}
                        {touch.contactEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {touch.contactEmail}
                          </span>
                        )}
                        {touch.contactPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {touch.contactPhone}
                          </span>
                        )}
                        {touch.socialMedia && (
                          <a
                            href={touch.socialMedia.startsWith('http') ? touch.socialMedia : `https://${touch.socialMedia}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <AtSign className="h-4 w-4" />
                            Соцсети
                          </a>
                        )}
                      </div>

                      {touch.source && (
                        <p className="text-sm text-gray-500 mb-1">
                          Источник: {touch.source}
                        </p>
                      )}

                      {touch.description && (
                        <p className="text-sm text-gray-700 mb-2">
                          {touch.description}
                        </p>
                      )}

                      {touch.response && (
                        <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                          <p className="text-sm text-green-800">
                            <MessageSquare className="h-4 w-4 inline mr-1" />
                            Ответ: {touch.response}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(touch.contactedAt).toLocaleDateString('ru-RU')}
                        </span>
                        {touch.followUpAt && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <CalendarClock className="h-3 w-3" />
                            Напомнить: {new Date(touch.followUpAt).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {touch.createdBy.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAiAnalysis(touch.id)}
                        disabled={isAnalyzing === touch.id}
                        title="AI Анализ"
                        className="text-purple-600 border-purple-300 hover:bg-purple-50"
                      >
                        {isAnalyzing === touch.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                      {touch.status !== 'CONVERTED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConvert(touch)}
                          title="Конвертировать в клиента"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
                      {touch.convertedToClientId && (
                        <Link href={`/clients/${touch.convertedToClientId}`}>
                          <Button variant="outline" size="sm" title="Перейти к клиенту">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(touch)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(touch.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {/* AI Analysis Result */}
                  {aiAnalysis?.touchId === touch.id && (
                    <div className="mt-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-700">AI Анализ</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiAnalysis.analysis}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Новое касание</DialogTitle>
            <DialogDescription>
              Добавьте информацию о контакте
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Имя контакта *</Label>
              <Input
                value={formData.contactName}
                onChange={(e) =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
                placeholder="Иван Иванов"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Телефон</Label>
                <Input
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Компания</Label>
                <Input
                  value={formData.contactCompany}
                  onChange={(e) =>
                    setFormData({ ...formData, contactCompany: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Соцсети</Label>
                <Input
                  value={formData.socialMedia}
                  onChange={(e) =>
                    setFormData({ ...formData, socialMedia: e.target.value })
                  }
                  placeholder="@username или ссылка"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Источник</Label>
              <Input
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
                placeholder="LinkedIn, конференция..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="О чём говорили, контекст..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Напомнить (дата)</Label>
              <Input
                type="date"
                value={formData.followUpAt}
                onChange={(e) =>
                  setFormData({ ...formData, followUpAt: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Редактировать касание</DialogTitle>
            <DialogDescription>Обновите информацию о контакте</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label>Имя контакта *</Label>
              <Input
                value={formData.contactName}
                onChange={(e) =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Телефон</Label>
                <Input
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Компания</Label>
                <Input
                  value={formData.contactCompany}
                  onChange={(e) =>
                    setFormData({ ...formData, contactCompany: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Соцсети</Label>
                <Input
                  value={formData.socialMedia}
                  onChange={(e) =>
                    setFormData({ ...formData, socialMedia: e.target.value })
                  }
                  placeholder="@username или ссылка"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Источник</Label>
              <Input
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Статус</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAITING">Ждём ответа</SelectItem>
                  <SelectItem value="RESPONDED">Ответил</SelectItem>
                  <SelectItem value="NO_RESPONSE">Не ответил</SelectItem>
                  <SelectItem value="FOLLOW_UP">Повторно связаться</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>Ответ контакта</Label>
              <Textarea
                value={formData.response}
                onChange={(e) =>
                  setFormData({ ...formData, response: e.target.value })
                }
                placeholder="Что ответил контакт..."
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>Напомнить (дата)</Label>
              <Input
                type="date"
                value={formData.followUpAt}
                onChange={(e) =>
                  setFormData({ ...formData, followUpAt: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
