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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppLayout } from '@/components/layout'
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

interface Member {
  id: string
  name: string
}

interface Touch {
  id: string
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
  contactCompany: string | null
  contactPosition: string | null
  industry: string | null
  socialMedia: string | null
  source: string | null
  status: string
  description: string | null
  sentMessage: string | null
  response: string | null
  contactedAt: string
  respondedAt: string | null
  followUpAt: string | null
  convertedToClientId: string | null
  aiAnalysis: string | null
  analyzedAt: string | null
  generatedMessage: string | null
  assigneeId: string | null
  assignee: {
    id: string
    name: string
  } | null
  createdBy: {
    id: string
    name: string
  }
}

interface TouchesClientProps {
  user: any
  workspace: any
  userRole: string
  members: Member[]
}

const statusLabels: Record<string, string> = {
  WAITING: 'Ждём ответа',
  WAITING_US: 'Ждут нашего ответа',
  RESPONDED: 'Ответил',
  NO_RESPONSE: 'Не ответил',
  FOLLOW_UP: 'Повторно связаться',
  CONVERTED: 'Конвертирован',
}

const statusColors: Record<string, string> = {
  WAITING: 'bg-yellow-100 text-yellow-800',
  WAITING_US: 'bg-orange-100 text-orange-800',
  RESPONDED: 'bg-green-100 text-green-800',
  NO_RESPONSE: 'bg-red-100 text-red-800',
  FOLLOW_UP: 'bg-blue-100 text-blue-800',
  CONVERTED: 'bg-purple-100 text-purple-800',
}

export default function TouchesClient({ user, workspace, userRole, members }: TouchesClientProps) {
  const router = useRouter()
  const [touches, setTouches] = useState<Touch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
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
    contactPosition: '',
    industry: '',
    socialMedia: '',
    source: '',
    description: '',
    sentMessage: '',
    followUpAt: '',
    status: 'WAITING',
    response: '',
    assigneeId: user.id,
  })
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchTouches()
  }, [filterStatus, filterAssignee])

  const fetchTouches = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/touches?status=${filterStatus}&assigneeId=${filterAssignee}`)
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
      contactPosition: '',
      industry: '',
      socialMedia: '',
      source: '',
      description: '',
      sentMessage: '',
      followUpAt: '',
      status: 'WAITING',
      response: '',
      assigneeId: user.id,
    })
    setGeneratedMessage(null)
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
      contactPosition: touch.contactPosition || '',
      industry: touch.industry || '',
      socialMedia: touch.socialMedia || '',
      source: touch.source || '',
      description: touch.description || '',
      sentMessage: touch.sentMessage || '',
      followUpAt: touch.followUpAt ? touch.followUpAt.split('T')[0] : '',
      status: touch.status,
      response: touch.response || '',
      assigneeId: touch.assigneeId || user.id,
    })
    setGeneratedMessage(touch.generatedMessage || null)
    setIsEditDialogOpen(true)
  }

  const handleCreate = async () => {
    if (!formData.contactName.trim()) {
      toast.error('Укажите имя контакта')
      return
    }

    setIsSubmitting(true)
    try {
      // Отправляем только нужные поля, преобразуем пустые строки в null
      const payload = {
        contactName: formData.contactName,
        contactEmail: formData.contactEmail || null,
        contactPhone: formData.contactPhone || null,
        contactCompany: formData.contactCompany || null,
        contactPosition: formData.contactPosition || null,
        industry: formData.industry || null,
        socialMedia: formData.socialMedia || null,
        source: formData.source || null,
        description: formData.description || null,
        sentMessage: formData.sentMessage || null,
        followUpAt: formData.followUpAt || null,
        assigneeId: formData.assigneeId,
      }
      const res = await fetch('/api/touches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      toast.success('Анализ завершён и сохранён')
      fetchTouches() // Refresh to show saved analysis
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsAnalyzing(null)
    }
  }

  const handleDeleteAiAnalysis = async (touchId: string) => {
    if (!confirm('Удалить AI анализ?')) return

    try {
      const res = await fetch(`/api/touches/${touchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiAnalysis: null, analyzedAt: null }),
      })

      if (!res.ok) {
        throw new Error('Ошибка удаления анализа')
      }

      toast.success('AI анализ удалён')
      setAiAnalysis(null)
      fetchTouches()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleStatusChange = async (touchId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/touches/${touchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка обновления статуса')
      }

      toast.success('Статус обновлён')
      fetchTouches()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleGenerateMessage = async () => {
    if (!formData.industry) {
      toast.error('Укажите сферу деятельности для генерации сообщения')
      return
    }

    setIsGeneratingMessage(true)
    try {
      const res = await fetch('/api/ai/generate-touch-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touchId: selectedTouch?.id,
          contactName: formData.contactName,
          industry: formData.industry,
          contactCompany: formData.contactCompany,
          contactPosition: formData.contactPosition,
          observations: formData.description,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка генерации сообщения')
      }

      const data = await res.json()
      setGeneratedMessage(data.message)
      toast.success('Сообщение сгенерировано')

      // Обновляем данные если это существующий touch
      if (selectedTouch?.id) {
        fetchTouches()
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsGeneratingMessage(false)
    }
  }

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/touches" userRole={userRole}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Касания</h2>
          <p className="text-sm text-muted-foreground">
            Отслеживание контактов и взаимодействий
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Новое касание
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow p-3 sm:p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Статус:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="WAITING">Ждём ответа</SelectItem>
                <SelectItem value="WAITING_US">Ждут нашего ответа</SelectItem>
                <SelectItem value="RESPONDED">Ответили</SelectItem>
                <SelectItem value="NO_RESPONSE">Не ответили</SelectItem>
                <SelectItem value="FOLLOW_UP">Повторно связаться</SelectItem>
                <SelectItem value="CONVERTED">Конвертированы</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Ответственный:</Label>
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Touches List */}
      <div className="bg-card rounded-lg shadow">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : touches.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Нет касаний</p>
            <Button onClick={openCreateDialog}>Создать первое касание</Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {touches.map((touch) => (
              <div
                key={touch.id}
                className="p-4 hover:bg-muted/50 active:bg-muted transition-colors touch-manipulation cursor-pointer"
                onClick={() => openEditDialog(touch)}
              >
                {/* Mobile Layout */}
                <div className="md:hidden">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{touch.contactName}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Badge className={`${statusColors[touch.status]} text-xs shrink-0 cursor-pointer hover:opacity-80 transition-opacity`}>
                          {statusLabels[touch.status]}
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <DropdownMenuItem
                            key={key}
                            onClick={() => handleStatusChange(touch.id, key)}
                            className={touch.status === key ? 'bg-muted' : ''}
                          >
                            <Badge className={`${statusColors[key]} text-xs mr-2`}>
                              {label}
                            </Badge>
                            {touch.status === key && <span className="ml-auto">✓</span>}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                    {touch.contactCompany && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {touch.contactCompany}
                      </span>
                    )}
                    {touch.contactEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{touch.contactEmail}</span>
                      </span>
                    )}
                    {touch.contactPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {touch.contactPhone}
                      </span>
                    )}
                    {touch.socialMedia && (
                      <a
                        href={touch.socialMedia.startsWith('http') ? touch.socialMedia : `https://${touch.socialMedia}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AtSign className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">Соцсети</span>
                      </a>
                    )}
                  </div>

                  {touch.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{touch.description}</p>
                  )}

                  {touch.response && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 mb-2">
                      <p className="text-xs text-green-800 dark:text-green-200 line-clamp-2">
                        <MessageSquare className="h-3 w-3 inline mr-1" />
                        {touch.response}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(touch.contactedAt).toLocaleDateString('ru-RU')}
                      </span>
                      {touch.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {touch.assignee.name}
                        </span>
                      )}
                    </div>
                    {touch.followUpAt && (
                      <span className="flex items-center gap-1 text-primary">
                        <CalendarClock className="h-3 w-3" />
                        {new Date(touch.followUpAt).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAiAnalysis(touch.id)}
                      disabled={isAnalyzing === touch.id}
                      className="text-purple-600 border-purple-300 h-8"
                    >
                      {isAnalyzing === touch.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </Button>
                    {touch.status !== 'CONVERTED' && (
                      <Button variant="outline" size="sm" onClick={() => handleConvert(touch)} className="h-8">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(touch)} className="h-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(touch.id)} className="h-8">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:block">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">{touch.contactName}</h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Badge className={`${statusColors[touch.status]} cursor-pointer hover:opacity-80 transition-opacity`}>
                              {statusLabels[touch.status]}
                            </Badge>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-56">
                            {Object.entries(statusLabels).map(([key, label]) => (
                              <DropdownMenuItem
                                key={key}
                                onClick={() => handleStatusChange(touch.id, key)}
                                className={touch.status === key ? 'bg-muted' : ''}
                              >
                                <Badge className={`${statusColors[key]} text-xs mr-2`}>
                                  {label}
                                </Badge>
                                {touch.status === key && <span className="ml-auto">✓</span>}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2 flex-wrap">
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
                            className="flex items-center gap-1 text-primary hover:text-primary/80"
                          >
                            <AtSign className="h-4 w-4" />
                            Соцсети
                          </a>
                        )}
                      </div>

                      {touch.source && (
                        <p className="text-sm text-muted-foreground mb-1">Источник: {touch.source}</p>
                      )}

                      {touch.description && (
                        <p className="text-sm text-foreground mb-2">{touch.description}</p>
                      )}

                      {touch.response && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 mb-2">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            <MessageSquare className="h-4 w-4 inline mr-1" />
                            Ответ: {touch.response}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(touch.contactedAt).toLocaleDateString('ru-RU')}
                        </span>
                        {touch.followUpAt && (
                          <span className="flex items-center gap-1 text-primary">
                            <CalendarClock className="h-3 w-3" />
                            Напомнить: {new Date(touch.followUpAt).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                        {touch.assignee && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {touch.assignee.name}
                          </span>
                        )}
                        {touch.createdBy.id !== touch.assignee?.id && (
                          <span className="flex items-center gap-1 text-muted-foreground/70">
                            Создал: {touch.createdBy.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
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
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(touch)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(touch.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* AI Analysis Result - показываем свежий анализ или сохраненный */}
                {(aiAnalysis?.touchId === touch.id || touch.aiAnalysis) && (
                  <div className="mt-3 p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Анализ</span>
                        {touch.analyzedAt && (
                          <span className="text-xs text-muted-foreground">
                            ({new Date(touch.analyzedAt).toLocaleDateString('ru-RU')})
                          </span>
                        )}
                      </div>
                      {touch.aiAnalysis && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAiAnalysis(touch.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {aiAnalysis?.touchId === touch.id ? aiAnalysis.analysis : touch.aiAnalysis}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
                <Label>Должность</Label>
                <Input
                  value={formData.contactPosition}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPosition: e.target.value })
                  }
                  placeholder="CEO, маркетолог..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Сфера деятельности</Label>
                <Input
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData({ ...formData, industry: e.target.value })
                  }
                  placeholder="IT, ресторан, салон красоты..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Соцсети</Label>
                <Input
                  value={formData.socialMedia}
                  onChange={(e) =>
                    setFormData({ ...formData, socialMedia: e.target.value })
                  }
                  placeholder="Вставьте ссылку (https://t.me/username)"
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
              <Label>Наблюдения о бизнесе</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Что увидели на сайте/в соцсетях, особенности бизнеса, боли которые заметили..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Ответственный</Label>
                <Select
                  value={formData.assigneeId}
                  onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        <DialogContent className="sm:max-w-[600px]">
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
                <Label>Должность</Label>
                <Input
                  value={formData.contactPosition}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPosition: e.target.value })
                  }
                  placeholder="CEO, маркетолог..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Сфера деятельности</Label>
                <Input
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData({ ...formData, industry: e.target.value })
                  }
                  placeholder="IT, ресторан, салон красоты..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Соцсети</Label>
                <Input
                  value={formData.socialMedia}
                  onChange={(e) =>
                    setFormData({ ...formData, socialMedia: e.target.value })
                  }
                  placeholder="Вставьте ссылку (https://t.me/username)"
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
                  <SelectItem value="WAITING_US">Ждут нашего ответа</SelectItem>
                  <SelectItem value="RESPONDED">Ответил</SelectItem>
                  <SelectItem value="NO_RESPONSE">Не ответил</SelectItem>
                  <SelectItem value="FOLLOW_UP">Повторно связаться</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Наблюдения о бизнесе</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Что увидели на сайте/в соцсетях, особенности бизнеса..."
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>Наше сообщение</Label>
              <Textarea
                value={formData.sentMessage}
                onChange={(e) =>
                  setFormData({ ...formData, sentMessage: e.target.value })
                }
                placeholder="Первое сообщение которое отправили контакту..."
                rows={3}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Ответственный</Label>
                <Select
                  value={formData.assigneeId}
                  onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {/* AI Message Generation */}
            <div className="border-t pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">AI Сообщение для первого касания</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateMessage}
                  disabled={isGeneratingMessage || !formData.industry}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  {isGeneratingMessage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Сгенерировать
                    </>
                  )}
                </Button>
              </div>
              {!formData.industry && (
                <p className="text-sm text-muted-foreground mb-2">
                  Укажите сферу деятельности для генерации сообщения
                </p>
              )}
              {generatedMessage && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <p className="text-sm whitespace-pre-wrap">{generatedMessage}</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedMessage)
                        toast.success('Скопировано в буфер обмена')
                      }}
                    >
                      Копировать
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, sentMessage: generatedMessage })
                        toast.success('Вставлено в "Наше сообщение"')
                      }}
                    >
                      Использовать
                    </Button>
                  </div>
                </div>
              )}
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
    </AppLayout>
  )
}
