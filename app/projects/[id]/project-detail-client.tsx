'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/lib/hooks/use-toast'
import { taskStatusLabels, priorityLabels } from '@/lib/validations/task'
import { InlineText, InlineTextarea } from '@/components/inline-edit'
import { ProgressBar, FinanceBlock, ActivitySidebar } from '@/components/project'
import { AppLayout } from '@/components/layout'
import { Sparkles, Loader2, Activity, FileText, Trash2, Pencil, Upload, Download, X, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { DocumentPreview } from '@/components/documents/document-preview'

export default function ProjectDetailClient({ project: initialProject, user, teamMembers, workspace }: any) {
  const router = useRouter()
  const { toast: showToast } = useToast()
  const [project, setProject] = useState(initialProject)
  const [activeTab, setActiveTab] = useState('overview')
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  // Dialog states
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isArchitectureDialogOpen, setIsArchitectureDialogOpen] = useState(false)
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: initialProject.name,
    status: initialProject.status,
    priority: initialProject.priority,
    type: initialProject.type,
    description: initialProject.description || '',
  })

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    assigneeId: '',
    dueDate: '',
  })
  const [architectureForm, setArchitectureForm] = useState({
    title: '',
    description: '',
    solution: '',
    hypotheses: '',
    constraints: '',
  })
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  })
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isActivitySidebarOpen, setIsActivitySidebarOpen] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<any | null>(null)

  // Inline update field
  const updateProjectField = useCallback(async (field: string, value: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error('Ошибка обновления')
      setProject({ ...project, [field]: value })
      showToast({ title: 'Сохранено', variant: 'success' })
    } catch (error) {
      showToast({ title: 'Ошибка сохранения', variant: 'destructive' })
      throw error
    }
  }, [project, toast])

  const tabs = [
    { id: 'overview', label: 'Обзор' },
    { id: 'pain', label: 'Боль и контекст' },
    { id: 'goals', label: 'Задачи и цели' },
    { id: 'architecture', label: 'Архитектура' },
    { id: 'tasks', label: `Задачи (${project.tasks?.length || 0})` },
    { id: 'milestones', label: 'Этапы' },
    { id: 'documents', label: 'Документы' },
    { id: 'comments', label: `Комментарии (${project.comments?.length || 0})` },
  ]

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) {
      showToast({ title: 'Укажите название задачи', variant: 'destructive' })
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description || undefined,
          status: taskForm.status,
          priority: taskForm.priority,
          projectId: project.id,
          workspaceId: project.workspaceId,
          assigneeId: taskForm.assigneeId && taskForm.assigneeId !== '' ? taskForm.assigneeId : undefined,
          dueDate: taskForm.dueDate && taskForm.dueDate !== '' ? taskForm.dueDate : undefined,
        }),
      })
      if (!res.ok) throw new Error('Ошибка создания задачи')
      const newTask = await res.json()
      setProject({
        ...project,
        tasks: [
          {
            ...newTask,
            assignee: teamMembers.find((m: any) => m.id === newTask.assigneeId),
          },
          ...(project.tasks || []),
        ],
      })
      setIsTaskDialogOpen(false)
      setTaskForm({ title: '', description: '', status: 'TODO', priority: 'MEDIUM', assigneeId: '', dueDate: '' })
      showToast({ title: 'Задача создана', variant: 'success' })
    } catch (error) {
      showToast({ title: 'Ошибка создания задачи', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGeneratePrompt = async () => {
    if (!architectureForm.title.trim() || !architectureForm.description.trim()) {
      showToast({ title: 'Заполните название и описание', variant: 'destructive' })
      return
    }
    setIsGeneratingPrompt(true)
    try {
      // Generate comprehensive prompt from architecture data
      const prompt = `# Задача: Создать первую модель проекта

## Контекст проекта
**Название:** ${project.name}
**Клиент:** ${project.client?.name || 'Не указан'}
${project.pain ? `**Боль клиента:** ${project.pain}` : ''}
${project.whyProblem ? `**Почему проблема:** ${project.whyProblem}` : ''}
${project.goals ? `**Цели:** ${project.goals}` : ''}
${project.expectedResult ? `**Ожидаемый результат:** ${project.expectedResult}` : ''}

## Версия архитектуры: ${architectureForm.title}
**Описание:** ${architectureForm.description}

${architectureForm.solution ? `**Решение:** ${architectureForm.solution}` : ''}

${architectureForm.hypotheses ? `**Гипотезы для проверки:**
${architectureForm.hypotheses}` : ''}

${architectureForm.constraints ? `**Известные ограничения:**
${architectureForm.constraints}` : ''}

## Требования к модели
Необходимо создать детальное техническое описание первой версии продукта, которое включает:

1. **Функциональные требования**
   - Список всех функций продукта
   - User stories для ключевых сценариев использования
   - Описание пользовательских интерфейсов

2. **Технический стек**
   - Рекомендуемые технологии (frontend, backend, БД)
   - Обоснование выбора технологий
   - Архитектурные паттерны

3. **Модель данных**
   - Основные сущности и их связи
   - Структура базы данных (схема)
   - API endpoints

4. **Этапы разработки**
   - Декомпозиция на этапы/спринты
   - Оценка трудозатрат
   - Критические пути и зависимости

5. **Риски и митигация**
   - Технические риски
   - Бизнес-риски
   - План снижения рисков

Результат должен быть готов к использованию для начала разработки.`

      setGeneratedPrompt(prompt)
      // Copy to clipboard
      await navigator.clipboard.writeText(prompt)
      toast.success('Промпт сгенерирован и скопирован в буфер обмена!')
    } catch (error) {
      showToast({ title: 'Ошибка генерации промпта', variant: 'destructive' })
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  const handleCreateArchitecture = async () => {
    if (!architectureForm.title.trim()) {
      showToast({ title: 'Укажите название версии', variant: 'destructive' })
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...architectureForm,
          projectId: project.id,
        }),
      })
      if (!res.ok) throw new Error('Ошибка создания версии')
      const newVersion = await res.json()
      setProject({
        ...project,
        architectureVersions: [...(project.architectureVersions || []), newVersion],
      })
      setIsArchitectureDialogOpen(false)
      setArchitectureForm({ title: '', description: '', solution: '', hypotheses: '', constraints: '' })
      setGeneratedPrompt('')
      showToast({ title: 'Версия архитектуры создана', variant: 'success' })
    } catch (error) {
      showToast({ title: 'Ошибка создания версии', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateMilestone = async () => {
    if (!milestoneForm.title.trim()) {
      showToast({ title: 'Укажите название этапа', variant: 'destructive' })
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...milestoneForm,
          projectId: project.id,
          dueDate: milestoneForm.dueDate || undefined,
        }),
      })
      if (!res.ok) throw new Error('Ошибка создания этапа')
      const newMilestone = await res.json()
      setProject({
        ...project,
        milestones: [...(project.milestones || []), newMilestone],
      })
      setIsMilestoneDialogOpen(false)
      setMilestoneForm({ title: '', description: '', dueDate: '' })
      showToast({ title: 'Этап создан', variant: 'success' })
    } catch (error) {
      showToast({ title: 'Ошибка создания этапа', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateComment = async () => {
    if (!newComment.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          content: newComment,
        }),
      })
      if (!res.ok) throw new Error('Ошибка создания комментария')
      const comment = await res.json()
      setProject({
        ...project,
        comments: [comment, ...(project.comments || [])],
      })
      setNewComment('')
      showToast({ title: 'Комментарий добавлен', variant: 'success' })
    } catch (error) {
      showToast({ title: 'Ошибка добавления комментария', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAIAnalysis = async () => {
    if (!project.pain) {
      showToast({ title: 'Сначала заполните описание боли клиента', variant: 'destructive' })
      return
    }
    setIsAIAnalyzing(true)
    setAiAnalysis(null)
    try {
      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pain-analysis',
          projectId: project.id,
          context: {
            painDescription: project.pain,
            whyProblem: project.whyProblem,
            consequences: project.consequences,
          },
        }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Ошибка AI анализа')
      }
      const data = await res.json()
      if (!data.analysis || data.analysis.trim() === '') {
        throw new Error('AI вернул пустой ответ')
      }
      setAiAnalysis(data.analysis)
      showToast({ title: 'AI анализ завершён', variant: 'success' })
    } catch (error: any) {
      console.error('AI analysis error:', error)
      showToast({
        title: 'Ошибка AI анализа',
        description: error.message || 'Проверьте настройки API ключа',
        variant: 'destructive'
      })
    } finally {
      setIsAIAnalyzing(false)
    }
  }

  const handleGenerateArchitecture = async () => {
    if (!project.pain && !project.goals) {
      showToast({ title: 'Сначала заполните боль и цели проекта', variant: 'destructive' })
      return
    }
    setIsAIAnalyzing(true)
    try {
      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'architecture',
          projectId: project.id,
          context: {
            pain: project.pain,
            goals: project.goals,
            expectedResult: project.expectedResult,
          },
        }),
      })
      if (!res.ok) throw new Error('Ошибка генерации')
      const data = await res.json()
      setArchitectureForm({
        title: 'AI-предложение',
        description: 'Сгенерировано AI на основе боли и целей',
        solution: data.solution || data.suggestions?.join('\n') || '',
        hypotheses: data.hypotheses || '',
        constraints: data.constraints || '',
      })
      setIsArchitectureDialogOpen(true)
      showToast({ title: 'AI предложение готово', variant: 'success' })
    } catch (error) {
      showToast({ title: 'Ошибка генерации', description: 'Проверьте настройки API ключа', variant: 'destructive' })
    } finally {
      setIsAIAnalyzing(false)
    }
  }

  const handleSaveAsTemplate = async () => {
    setIsSavingTemplate(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка создания шаблона')
      }
      toast.success('Шаблон создан')
      router.push('/templates')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка создания шаблона')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleEditProject = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Ошибка обновления проекта')
      const data = await res.json()
      setProject({ ...project, ...data.project })
      setIsEditDialogOpen(false)
      showToast({ title: 'Проект обновлён', variant: 'success' })
      router.refresh()
    } catch (error) {
      showToast({ title: 'Ошибка обновления проекта', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProject = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка удаления проекта')
      }
      toast.success('Проект удалён')
      router.push('/projects')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка удаления проекта')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/projects" userRole={user.role}>
      {/* Project Header */}
      <div className="bg-card rounded-lg shadow p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground">
                ← Проекты
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">Клиент: {project.client.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={project.status}
              onValueChange={async (value) => {
                try {
                  const res = await fetch(`/api/projects/${project.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: value }),
                  })
                  if (!res.ok) throw new Error('Ошибка обновления')
                  setProject({ ...project, status: value })
                  toast.success('Статус обновлён')
                } catch (error) {
                  toast.error('Ошибка обновления статуса')
                }
              }}
            >
              <SelectTrigger className={`w-[160px] ${getStatusColor(project.status)}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LEAD">Лид</SelectItem>
                <SelectItem value="QUALIFICATION">Квалификация</SelectItem>
                <SelectItem value="BRIEFING">Брифинг</SelectItem>
                <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                <SelectItem value="ON_HOLD">На паузе</SelectItem>
                <SelectItem value="COMPLETED">Завершён</SelectItem>
                <SelectItem value="REJECTED">Отклонён</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAsTemplate}
              disabled={isSavingTemplate}
            >
              {isSavingTemplate ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Сохранить как шаблон
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsActivitySidebarOpen(true)}
            >
              <Activity className="h-4 w-4 mr-2" />
              История
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditForm({
                  name: project.name,
                  status: project.status,
                  priority: project.priority,
                  type: project.type,
                  description: project.description || '',
                })
                setIsEditDialogOpen(true)
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          </div>
        </div>
      </div>

      {/* Project Tabs */}
      <div className="bg-card rounded-lg shadow mb-4">
        <div className="px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab project={project} updateProjectField={updateProjectField} />}
        {activeTab === 'pain' && (
          <PainTab
            project={project}
            isAIAnalyzing={isAIAnalyzing}
            aiAnalysis={aiAnalysis}
            onAnalyze={handleAIAnalysis}
            updateProjectField={updateProjectField}
          />
        )}
        {activeTab === 'goals' && <GoalsTab project={project} updateProjectField={updateProjectField} />}
        {activeTab === 'architecture' && (
          <ArchitectureTab
            project={project}
            isAIAnalyzing={isAIAnalyzing}
            onCreateVersion={() => setIsArchitectureDialogOpen(true)}
            onGenerateAI={handleGenerateArchitecture}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksTab project={project} teamMembers={teamMembers} onCreateTask={() => setIsTaskDialogOpen(true)} />
        )}
        {activeTab === 'milestones' && (
          <MilestonesTab project={project} onCreateMilestone={() => setIsMilestoneDialogOpen(true)} />
        )}
        {activeTab === 'documents' && <DocumentsTab project={project} onDocumentsUpdate={() => router.refresh()} onPreview={setPreviewDocument} />}
        {activeTab === 'comments' && (
          <CommentsTab
            project={project}
            newComment={newComment}
            setNewComment={setNewComment}
            onSubmit={handleCreateComment}
            isSubmitting={isSubmitting}
          />
        )}
      </div>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Новая задача</DialogTitle>
            <DialogDescription>Создайте задачу для проекта</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Название *</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Что нужно сделать?"
              />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Статус</Label>
                <Select value={taskForm.status} onValueChange={(v) => setTaskForm({ ...taskForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(taskStatusLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Приоритет</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Исполнитель</Label>
                <Select value={taskForm.assigneeId || 'none'} onValueChange={(v) => setTaskForm({ ...taskForm, assigneeId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не назначен</SelectItem>
                    {teamMembers.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Срок</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateTask} disabled={isSubmitting}>
              {isSubmitting ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Architecture Dialog */}
      <Dialog open={isArchitectureDialogOpen} onOpenChange={setIsArchitectureDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Новая версия архитектуры</DialogTitle>
            <DialogDescription>Опишите архитектурное решение</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label>Название версии *</Label>
              <Input
                value={architectureForm.title}
                onChange={(e) => setArchitectureForm({ ...architectureForm, title: e.target.value })}
                placeholder="Например: MVP v1"
              />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                value={architectureForm.description}
                onChange={(e) => setArchitectureForm({ ...architectureForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>Решение</Label>
              <Textarea
                value={architectureForm.solution}
                onChange={(e) => setArchitectureForm({ ...architectureForm, solution: e.target.value })}
                rows={4}
                placeholder="Опишите предлагаемое решение..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Гипотезы</Label>
              <Textarea
                value={architectureForm.hypotheses}
                onChange={(e) => setArchitectureForm({ ...architectureForm, hypotheses: e.target.value })}
                rows={2}
                placeholder="Какие гипотезы проверяем..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Ограничения</Label>
              <Textarea
                value={architectureForm.constraints}
                onChange={(e) => setArchitectureForm({ ...architectureForm, constraints: e.target.value })}
                rows={2}
                placeholder="Известные ограничения..."
              />
            </div>

            {/* Generate AI Prompt Button */}
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGeneratePrompt}
                disabled={isGeneratingPrompt || !architectureForm.title || !architectureForm.description}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isGeneratingPrompt ? 'Генерация...' : 'Сгенерировать AI промпт из данных'}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Создаст готовый промпт для AI с полным описанием проекта и требований
              </p>
            </div>

            {/* Show Generated Prompt */}
            {generatedPrompt && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Сгенерированный промпт</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPrompt)
                      toast.success('Скопировано!')
                    }}
                  >
                    Копировать
                  </Button>
                </div>
                <Textarea
                  value={generatedPrompt}
                  readOnly
                  rows={10}
                  className="text-xs font-mono bg-white"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsArchitectureDialogOpen(false)
              setGeneratedPrompt('')
            }}>Отмена</Button>
            <Button onClick={handleCreateArchitecture} disabled={isSubmitting}>
              {isSubmitting ? 'Создание...' : 'Создать версию'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Milestone Dialog */}
      <Dialog open={isMilestoneDialogOpen} onOpenChange={setIsMilestoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый этап</DialogTitle>
            <DialogDescription>Добавьте этап проекта</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Название *</Label>
              <Input
                value={milestoneForm.title}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                placeholder="Например: Запуск MVP"
              />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>Срок</Label>
              <Input
                type="date"
                value={milestoneForm.dueDate}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMilestoneDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateMilestone} disabled={isSubmitting}>
              {isSubmitting ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Sidebar */}
      <ActivitySidebar
        projectId={project.id}
        isOpen={isActivitySidebarOpen}
        onClose={() => setIsActivitySidebarOpen(!isActivitySidebarOpen)}
      />

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Редактировать проект</DialogTitle>
            <DialogDescription>Измените информацию о проекте</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Название *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Название проекта"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Статус</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAD">Лид</SelectItem>
                    <SelectItem value="QUALIFICATION">Квалификация</SelectItem>
                    <SelectItem value="BRIEFING">Брифинг</SelectItem>
                    <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                    <SelectItem value="ON_HOLD">На паузе</SelectItem>
                    <SelectItem value="COMPLETED">Завершён</SelectItem>
                    <SelectItem value="REJECTED">Отклонён</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Приоритет</Label>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Тип проекта</Label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONEY">Деньги</SelectItem>
                  <SelectItem value="GROWTH">Рост</SelectItem>
                  <SelectItem value="INVESTMENT">Инвестиция</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleEditProject} disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить проект</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить проект "{project.name}"? Это действие нельзя отменить.
              Все задачи, комментарии и документы проекта будут удалены.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={isDeleting}>
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Sidebar */}
      <ActivitySidebar
        isOpen={isActivitySidebarOpen}
        onClose={() => setIsActivitySidebarOpen(false)}
        projectId={project.id}
      />

      {/* Document Preview */}
      {previewDocument && (
        <DocumentPreview
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
          document={previewDocument}
        />
      )}
    </AppLayout>
  )
}

// Tab Components
function OverviewTab({ project, updateProjectField }: any) {
  const completedTasks = project.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0
  const totalTasks = project.tasks?.length || 0
  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <ProgressBar completed={completedTasks} total={totalTasks} size="lg" />
      </div>

      {/* Finance Block */}
      <FinanceBlock budget={project.budget} revenue={project.revenue} />

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Информация о проекте</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип проекта</label>
            <p className="text-gray-900">{project.type === 'MONEY' ? 'Деньги' : project.type === 'GROWTH' ? 'Рост' : 'Инвестиция'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
            <p className="text-gray-900">{getPriorityLabel(project.priority)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата старта</label>
            <p className="text-gray-900">{project.startDate ? new Date(project.startDate).toLocaleDateString('ru-RU') : 'Не указана'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата завершения (план)</label>
            <p className="text-gray-900">{project.endDatePlan ? new Date(project.endDatePlan).toLocaleDateString('ru-RU') : 'Не указана'}</p>
          </div>
        </div>
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
          <InlineTextarea
            value={project.description || ''}
            onSave={(value) => updateProjectField('description', value)}
            placeholder="Добавьте описание проекта..."
          />
        </div>
      </div>
      {/* Key Decision - Inline Editable */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Ключевое решение</h3>
        <InlineTextarea
          value={project.keyDecision || ''}
          onSave={(value) => updateProjectField('keyDecision', value)}
          placeholder="Какое ключевое решение было принято?"
          className="text-blue-900"
        />
        <div className="mt-3">
          <h4 className="text-sm font-medium text-blue-900 mb-1">Почему:</h4>
          <InlineTextarea
            value={project.decisionReason || ''}
            onSave={(value) => updateProjectField('decisionReason', value)}
            placeholder="Почему было принято это решение?"
            className="text-blue-800"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Всего задач</h3>
          <p className="text-3xl font-bold text-gray-900">{totalTasks}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Выполнено</h3>
          <p className="text-3xl font-bold text-green-600">{completedTasks}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Комментариев</h3>
          <p className="text-3xl font-bold text-blue-600">{project.comments?.length || 0}</p>
        </div>
      </div>
    </div>
  )
}

function PainTab({ project, isAIAnalyzing, aiAnalysis, onAnalyze, updateProjectField }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Боль и контекст клиента</h2>
        <Button onClick={onAnalyze} disabled={isAIAnalyzing} variant="outline">
          {isAIAnalyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Анализ...</> : <><Sparkles className="h-4 w-4 mr-2" />Анализ AI</>}
        </Button>
      </div>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Описание боли</label>
          <InlineTextarea
            value={project.pain || ''}
            onSave={(value) => updateProjectField('pain', value)}
            placeholder="Опишите боль клиента..."
            rows={4}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Почему это проблема</label>
          <InlineTextarea
            value={project.whyProblem || ''}
            onSave={(value) => updateProjectField('whyProblem', value)}
            placeholder="Почему это является проблемой?"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Последствия, если ничего не менять</label>
          <InlineTextarea
            value={project.consequences || ''}
            onSave={(value) => updateProjectField('consequences', value)}
            placeholder="Какие последствия, если ничего не менять?"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Дополнительный контекст</label>
          <InlineTextarea
            value={project.context || ''}
            onSave={(value) => updateProjectField('context', value)}
            placeholder="Дополнительный контекст..."
            rows={3}
          />
        </div>
        {aiAnalysis && (
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center"><Sparkles className="h-5 w-5 mr-2" />AI Анализ</h3>
            <div className="p-4 bg-purple-50 rounded-md border border-purple-200">
              <p className="text-purple-900 whitespace-pre-wrap">{aiAnalysis}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GoalsTab({ project, updateProjectField }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-6">Задачи и цели проекта</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Основные задачи</label>
          <InlineTextarea
            value={project.goals || ''}
            onSave={(value) => updateProjectField('goals', value)}
            placeholder="Основные задачи проекта..."
            rows={4}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ожидаемый результат</label>
          <InlineTextarea
            value={project.expectedResult || ''}
            onSave={(value) => updateProjectField('expectedResult', value)}
            placeholder="Что мы ожидаем получить в результате?"
            rows={4}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Критерии успеха</label>
          <InlineTextarea
            value={project.successCriteria || ''}
            onSave={(value) => updateProjectField('successCriteria', value)}
            placeholder="По каким критериям определим успех?"
            rows={4}
          />
        </div>
      </div>
    </div>
  )
}

function ArchitectureTab({ project, isAIAnalyzing, onCreateVersion, onGenerateAI }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Архитектура решения</h2>
          <div className="flex gap-2">
            <Button onClick={onGenerateAI} disabled={isAIAnalyzing} variant="outline">
              {isAIAnalyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Генерация...</> : <><Sparkles className="h-4 w-4 mr-2" />AI предложение</>}
            </Button>
            <Button onClick={onCreateVersion}>Создать версию</Button>
          </div>
        </div>
        {project.architectureVersions && project.architectureVersions.length > 0 ? (
          <div className="space-y-4">
            {project.architectureVersions.map((version: any) => (
              <div key={version.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Версия {version.version}: {version.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{new Date(version.createdAt).toLocaleDateString('ru-RU')}</p>
                  </div>
                </div>
                {version.description && <p className="text-gray-700 mb-3">{version.description}</p>}
                {version.solution && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Решение:</h4>
                    <p className="text-gray-900 text-sm whitespace-pre-wrap">{version.solution}</p>
                  </div>
                )}
                {version.hypotheses && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Гипотезы:</h4>
                    <p className="text-gray-900 text-sm whitespace-pre-wrap">{version.hypotheses}</p>
                  </div>
                )}
                {version.constraints && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Ограничения:</h4>
                    <p className="text-gray-900 text-sm whitespace-pre-wrap">{version.constraints}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Нет версий архитектуры</p>
            <Button onClick={onCreateVersion}>Создать первую версию</Button>
          </div>
        )}
      </div>
    </div>
  )
}

function TasksTab({ project, teamMembers, onCreateTask }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Внутренние задачи</h2>
          <Button onClick={onCreateTask}>Создать задачу</Button>
        </div>
        {project.tasks && project.tasks.length > 0 ? (
          <div className="space-y-3">
            {project.tasks.map((task: any) => (
              <div key={task.id} className="border-l-4 border-l-blue-500 border rounded-lg p-4 hover:bg-blue-50/50 bg-blue-50/20 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    {task.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <Badge className={getTaskStatusColor(task.status)}>{getTaskStatusLabel(task.status)}</Badge>
                      {task.assignee && (
                        <span className="text-xs text-gray-600 flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                          Исполнитель: {task.assignee.name}
                        </span>
                      )}
                      {task.createdBy && (
                        <span className="text-xs text-gray-500 flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1"></span>
                          Создал: {task.createdBy.name}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="text-xs text-gray-600">
                          До: {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Нет задач</p>
            <Button onClick={onCreateTask}>Создать первую задачу</Button>
          </div>
        )}
      </div>
    </div>
  )
}

function MilestonesTab({ project, onCreateMilestone }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Этапы проекта</h2>
        <Button onClick={onCreateMilestone}>Добавить этап</Button>
      </div>
      {project.milestones && project.milestones.length > 0 ? (
        <div className="space-y-4">
          {project.milestones.map((milestone: any, index: number) => (
            <div key={milestone.id} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{index + 1}. {milestone.title}</h3>
                  {milestone.description && <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>}
                  {milestone.dueDate && <p className="text-xs text-gray-500 mt-2">Срок: {new Date(milestone.dueDate).toLocaleDateString('ru-RU')}</p>}
                </div>
                <Badge className={getMilestoneStatusColor(milestone.status)}>{getMilestoneStatusLabel(milestone.status)}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Нет этапов</p>
          <Button onClick={onCreateMilestone}>Добавить первый этап</Button>
        </div>
      )}
    </div>
  )
}

function DocumentsTab({ project, onDocumentsUpdate, onPreview }: any) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedType, setSelectedType] = useState('OTHER')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const typeLabels: Record<string, string> = {
    CONTRACT: 'Договор',
    BRIEF: 'Бриф',
    INVOICE: 'Счёт',
    PRESENTATION: 'Презентация',
    OTHER: 'Другое',
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимальный размер: 10MB')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', project.id)
      formData.append('type', selectedType)

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка загрузки')
      }

      toast.success('Документ загружен')
      onDocumentsUpdate?.()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Удалить этот документ?')) return

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Ошибка удаления')

      toast.success('Документ удалён')
      onDocumentsUpdate?.()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDownload = (doc: any) => {
    const link = document.createElement('a')
    link.href = doc.url
    link.download = doc.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePreview = (doc: any) => {
    onPreview(doc)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Документы</h2>
        <div className="flex items-center gap-2">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isUploading ? 'Загрузка...' : 'Загрузить документ'}
          </Button>
        </div>
      </div>
      {project.documents && project.documents.length > 0 ? (
        <div className="space-y-3">
          {project.documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-gray-400" />
                <div>
                  <h3 className="font-medium text-gray-900">{doc.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {typeLabels[doc.type] || doc.type} • Версия {doc.version} • {new Date(doc.uploadedAt).toLocaleDateString('ru-RU')}
                    {doc.size && ` • ${(doc.size / 1024).toFixed(1)} KB`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePreview(doc)}>
                  <Eye className="h-4 w-4 mr-1" />
                  Просмотр
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                  <Download className="h-4 w-4 mr-1" />
                  Скачать
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Нет документов</p>
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Upload className="h-4 w-4 mr-2" />
            Загрузить первый документ
          </Button>
        </div>
      )}
    </div>
  )
}

function CommentsTab({ project, newComment, setNewComment, onSubmit, isSubmitting }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-6">Комментарии</h2>
      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Написать комментарий..."
          className="w-full min-h-24 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={onSubmit} disabled={!newComment.trim() || isSubmitting}>
            {isSubmitting ? 'Отправка...' : 'Отправить'}
          </Button>
        </div>
      </div>
      {project.comments && project.comments.length > 0 ? (
        <div className="space-y-4">
          {project.comments.map((comment: any) => (
            <div key={comment.id} className="border-b pb-4 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-medium text-gray-900">{comment.author.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {new Date(comment.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <p className="text-gray-900 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8"><p className="text-gray-500">Нет комментариев</p></div>
      )}
    </div>
  )
}

// Helpers
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    LEAD: 'bg-gray-100 text-gray-800',
    QUALIFICATION: 'bg-yellow-100 text-yellow-800',
    BRIEFING: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
    ON_HOLD: 'bg-orange-100 text-orange-800',
    COMPLETED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }
  return colors[status] || colors.LEAD
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    LEAD: 'Лид', QUALIFICATION: 'Квалификация', BRIEFING: 'Брифинг', IN_PROGRESS: 'В работе',
    ON_HOLD: 'На паузе', COMPLETED: 'Завершён', REJECTED: 'Отклонён',
  }
  return labels[status] || status
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = { LOW: 'Низкий', MEDIUM: 'Средний', HIGH: 'Высокий', URGENT: 'Срочный' }
  return labels[priority] || priority
}

function getTaskStatusColor(status: string): string {
  const colors: Record<string, string> = {
    TODO: 'bg-gray-100 text-gray-800', IN_PROGRESS: 'bg-blue-100 text-blue-800',
    IN_REVIEW: 'bg-purple-100 text-purple-800', BLOCKED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-green-100 text-green-800', CANCELLED: 'bg-gray-100 text-gray-600',
  }
  return colors[status] || colors.TODO
}

function getTaskStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    TODO: 'К выполнению', IN_PROGRESS: 'В работе', IN_REVIEW: 'На проверке',
    BLOCKED: 'Заблокирована', COMPLETED: 'Выполнена', CANCELLED: 'Отменена',
  }
  return labels[status] || status
}

function getMilestoneStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-800', IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800',
  }
  return colors[status] || colors.PENDING
}

function getMilestoneStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Ожидает', IN_PROGRESS: 'В работе', COMPLETED: 'Завершён', CANCELLED: 'Отменён',
  }
  return labels[status] || status
}
