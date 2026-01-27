'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { QuestionEditor } from './question-editor'
import { toast } from 'sonner'
import {
  FileText,
  Plus,
  Send,
  Copy,
  Check,
  Loader2,
  Eye,
  Download,
  Trash2,
  PlusCircle,
} from 'lucide-react'

interface Brief {
  id: string
  title: string
  description?: string
  accessKey: string
  status: string
  completedAt?: string
  clientName?: string
  clientEmail?: string
  questions: any[]
  answers: any[]
}

interface BriefEditorProps {
  projectId: string
  briefId?: string
  onClose?: () => void
}

export function BriefEditor({ projectId, briefId, onClose }: BriefEditorProps) {
  const [brief, setBrief] = useState<Brief | null>(null)
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Форма создания/редактирования брифа
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [accessKey, setAccessKey] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  // Добавление нового вопроса
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

  // Скопирована ли ссылка
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (briefId) {
      loadBrief()
    } else {
      // Попробовать загрузить существующие брифы проекта
      loadProjectBriefs()
    }
  }, [briefId])

  const loadProjectBriefs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/briefs`)
      if (!response.ok) throw new Error('Failed to load briefs')

      const data = await response.json()
      setBriefs(data.briefs || [])

      if (data.briefs && data.briefs.length > 0) {
        // Если есть брифы - загрузить первый
        const firstBrief = data.briefs[0]
        selectBrief(firstBrief)
      } else {
        // Если брифов нет - подготовить форму для создания
        setIsCreatingNew(true)
        setAccessKey(generateAccessKey())
      }
    } catch (error: any) {
      console.error('[Brief Editor] Load project briefs error:', error)
      // Если ошибка - подготовить форму для создания
      setIsCreatingNew(true)
      setAccessKey(generateAccessKey())
    } finally {
      setIsLoading(false)
    }
  }

  const selectBrief = (selectedBrief: Brief) => {
    setBrief(selectedBrief)
    setTitle(selectedBrief.title)
    setDescription(selectedBrief.description || '')
    setAccessKey(selectedBrief.accessKey)
    setIsCreatingNew(false)
  }

  const startNewBrief = () => {
    setBrief(null)
    setTitle('')
    setDescription('')
    setAccessKey(generateAccessKey())
    setIsCreatingNew(true)
  }

  const generateAccessKey = () => {
    return Math.random().toString(36).substring(2, 10)
  }

  const loadBrief = async () => {
    setIsLoading(true)
    try {
      // Use briefId from props or brief.id from state
      const id = briefId || brief?.id
      if (!id) {
        throw new Error('No brief ID available')
      }

      const response = await fetch(`/api/briefs/${id}`)
      if (!response.ok) throw new Error('Failed to load brief')

      const data = await response.json()
      setBrief(data.brief)
      setTitle(data.brief.title)
      setDescription(data.brief.description || '')
      setAccessKey(data.brief.accessKey)
    } catch (error: any) {
      toast.error(error.message || 'Ошибка загрузки брифа')
    } finally {
      setIsLoading(false)
    }
  }

  const createBrief = async () => {
    if (!title.trim() || !accessKey.trim()) {
      toast.error('Заполните название и пароль')
      return
    }

    if (!projectId) {
      toast.error('Project ID не найден')
      return
    }

    setIsSaving(true)
    try {
      console.log('[Brief Editor] Creating brief with projectId:', projectId)
      const response = await fetch('/api/briefs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          accessKey: accessKey.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create brief')
      }

      const data = await response.json()

      // Обновить список брифов и выбрать новый
      await loadProjectBriefs()
      selectBrief(data.brief)

      toast.success('Бриф создан')
    } catch (error: any) {
      console.error('[Brief Editor] Create error:', error)
      toast.error(error.message || 'Ошибка создания брифа')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteBrief = async () => {
    if (!brief) return

    if (!confirm(`Удалить бриф "${brief.title}"? Это действие нельзя отменить.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/briefs/${brief.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete brief')

      toast.success('Бриф удалён')

      // Обновить список и выбрать первый бриф или показать форму создания
      await loadProjectBriefs()
    } catch (error: any) {
      toast.error(error.message || 'Ошибка удаления брифа')
    } finally {
      setIsDeleting(false)
    }
  }

  const updateBriefInfo = async () => {
    if (!brief) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/briefs/${brief.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          accessKey: accessKey.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to update brief')

      toast.success('Бриф обновлён')
      await loadBrief()
    } catch (error: any) {
      toast.error(error.message || 'Ошибка обновления брифа')
    } finally {
      setIsSaving(false)
    }
  }

  const addQuestion = async (questionData: any) => {
    if (!brief) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/briefs/${brief.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData),
      })

      if (!response.ok) throw new Error('Failed to add question')

      toast.success('Вопрос добавлен')
      setIsAddingQuestion(false)
      await loadBrief()
    } catch (error: any) {
      toast.error(error.message || 'Ошибка добавления вопроса')
    } finally {
      setIsSaving(false)
    }
  }

  const updateQuestion = async (questionData: any) => {
    if (!brief) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/briefs/${brief.id}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData),
      })

      if (!response.ok) throw new Error('Failed to update question')

      toast.success('Вопрос обновлён')
      setEditingQuestionId(null)
      await loadBrief()
    } catch (error: any) {
      toast.error(error.message || 'Ошибка обновления вопроса')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteQuestion = async (questionId: string) => {
    if (!brief || !confirm('Удалить вопрос?')) return

    setIsSaving(true)
    try {
      const response = await fetch(
        `/api/briefs/${brief.id}/questions?questionId=${questionId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to delete question')

      toast.success('Вопрос удалён')
      await loadBrief()
    } catch (error: any) {
      toast.error(error.message || 'Ошибка удаления вопроса')
    } finally {
      setIsSaving(false)
    }
  }

  const sendToClient = async () => {
    if (!brief) return

    if (brief.questions.length === 0) {
      toast.error('Добавьте хотя бы один вопрос')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch(`/api/briefs/${brief.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) throw new Error('Failed to send brief')

      const data = await response.json()
      toast.success('Бриф отправлен клиенту')
      await loadBrief()
    } catch (error: any) {
      toast.error(error.message || 'Ошибка отправки брифа')
    } finally {
      setIsSending(false)
    }
  }

  const copyLink = () => {
    const appUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const link = `${appUrl}/brief/${accessKey}`
    navigator.clipboard.writeText(link)

    setLinkCopied(true)
    toast.success('Ссылка скопирована')

    setTimeout(() => setLinkCopied(false), 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'SENT': return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Черновик'
      case 'SENT': return 'Отправлен'
      case 'IN_PROGRESS': return 'Заполняется'
      case 'COMPLETED': return 'Заполнен'
      default: return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Основной layout с sidebar
  const renderLayout = (content: React.ReactNode) => {
    return (
      <div className="flex gap-6">
        {/* Sidebar со списком брифов */}
        <Card className="w-80 flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-lg">Брифы проекта</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Кнопка создания нового брифа */}
            <Button
              onClick={startNewBrief}
              variant="outline"
              className="w-full justify-start"
              disabled={isCreatingNew}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Создать новый бриф
            </Button>

            {/* Список брифов */}
            <div className="space-y-2 pt-2">
              {briefs.length === 0 && !isCreatingNew && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Брифов пока нет
                </p>
              )}
              {briefs.map((b) => (
                <button
                  key={b.id}
                  onClick={() => selectBrief(b)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    brief?.id === b.id
                      ? 'bg-primary/5 border-primary'
                      : 'hover:bg-muted border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{b.title}</p>
                      <Badge className={`${getStatusColor(b.status)} text-xs mt-1`}>
                        {getStatusLabel(b.status)}
                      </Badge>
                    </div>
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Основной контент */}
        <div className="flex-1">{content}</div>
      </div>
    )
  }

  // Если создается новый бриф
  if (isCreatingNew && !brief) {
    return renderLayout(
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Создать бриф
            </CardTitle>
            <CardDescription>
              Составьте вопросы для клиента и отправьте ссылку для заполнения
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Название брифа *</Label>
              <Input
                placeholder="Например: Бриф на разработку сайта"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                placeholder="Краткое описание брифа..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Пароль доступа *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Придумайте пароль для клиента"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={() => setAccessKey(generateAccessKey())}
                >
                  Сгенерировать
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Клиент будет использовать этот пароль для доступа к брифу
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={createBrief}
                disabled={isSaving || !title.trim() || !accessKey.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Создание...
                  </>
                ) : (
                  'Создать бриф'
                )}
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Отмена
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Редактирование существующего брифа
  return renderLayout(
    <div className="space-y-6">
      {/* Информация о брифе */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription>
                {description || 'Без описания'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(brief.status)}>
                {getStatusLabel(brief.status)}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteBrief}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={brief.status !== 'DRAFT'}
              />
            </div>
            <div className="space-y-2">
              <Label>Пароль</Label>
              <Input
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                disabled={brief.status !== 'DRAFT'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={brief.status !== 'DRAFT'}
              rows={2}
            />
          </div>

          {brief.status === 'DRAFT' && (
            <Button onClick={updateBriefInfo} disabled={isSaving}>
              {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          )}

          {brief.status !== 'DRAFT' && (
            <div className="flex items-center gap-2">
              <Button onClick={copyLink} variant="outline">
                {linkCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Скопировать ссылку
                  </>
                )}
              </Button>
              {brief.status === 'COMPLETED' && (
                <span className="text-sm text-muted-foreground">
                  Заполнен: {new Date(brief.completedAt!).toLocaleString('ru')}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Вопросы */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Вопросы ({brief.questions.length})</CardTitle>
            {brief.status === 'DRAFT' && (
              <Button
                size="sm"
                onClick={() => setIsAddingQuestion(true)}
                disabled={isAddingQuestion || editingQuestionId !== null}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить вопрос
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAddingQuestion && (
            <QuestionEditor
              onSave={addQuestion}
              onCancel={() => setIsAddingQuestion(false)}
            />
          )}

          {brief.questions.map((question, index) => (
            <div key={question.id}>
              {editingQuestionId === question.id ? (
                <QuestionEditor
                  question={question}
                  onSave={updateQuestion}
                  onDelete={() => deleteQuestion(question.id)}
                  onCancel={() => setEditingQuestionId(null)}
                />
              ) : (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <Badge variant="outline">{question.type}</Badge>
                          {question.required && (
                            <Badge variant="secondary">Обязательно</Badge>
                          )}
                        </div>
                        <p className="font-medium">{question.question}</p>
                        {question.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {question.description}
                          </p>
                        )}

                        {/* Показать ответ клиента если есть */}
                        {brief.status === 'COMPLETED' && (
                          <>
                            {brief.answers.find(a => a.questionId === question.id) && (
                              <div className="mt-3 p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Ответ клиента:</p>
                                <p className="text-sm">
                                  {JSON.stringify(
                                    brief.answers.find(a => a.questionId === question.id)?.answer
                                  )}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {brief.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingQuestionId(question.id)}
                        >
                          Редактировать
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}

          {brief.questions.length === 0 && !isAddingQuestion && (
            <div className="text-center py-8 text-muted-foreground">
              Вопросов пока нет. Добавьте первый вопрос для клиента.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Действия */}
      {brief.status === 'DRAFT' && brief.questions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={sendToClient}
              disabled={isSending}
              className="w-full"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Отправить клиенту
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center mt-2">
              После отправки клиент сможет заполнить бриф по ссылке
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
