'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/lib/hooks/use-toast'
import { InlineText, InlineTextarea } from '@/components/inline-edit'
import { ProgressBar } from '@/components/project'
import {
  Home,
  CheckSquare,
  Plus,
  Clock,
  Play,
  Pause,
  Square,
  MessageSquare,
  Calendar,
  User,
  Folder,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { format, isValid } from 'date-fns'
import { ru } from 'date-fns/locale'

interface TaskDetailClientProps {
  task: any
  user: any
  workspace: any
  teamMembers: Array<{ id: string; name: string; email: string }>
}

const taskStatusLabels: Record<string, string> = {
  BACKLOG: 'Бэклог',
  TODO: 'К выполнению',
  IN_PROGRESS: 'В работе',
  IN_REVIEW: 'На проверке',
  COMPLETED: 'Выполнено',
}

const taskStatusColors: Record<string, string> = {
  BACKLOG: 'bg-gray-100 text-gray-800',
  TODO: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  IN_REVIEW: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
}

const priorityLabels: Record<string, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
}

export default function TaskDetailClient({
  task: initialTask,
  user,
  workspace,
  teamMembers,
}: TaskDetailClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [task, setTask] = useState(initialTask)
  const [newSubtask, setNewSubtask] = useState('')
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)

  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerStart, setTimerStart] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Error logging on mount
  useEffect(() => {
    try {
      console.log('TaskDetailClient mounted with task:', {
        id: initialTask?.id,
        title: initialTask?.title,
        hasProject: !!initialTask?.project,
        hasAssignee: !!initialTask?.assignee,
        hasCreatedBy: !!initialTask?.createdBy,
        subtasksCount: initialTask?.subtasks?.length || 0,
        commentsCount: initialTask?.comments?.length || 0,
        dueDate: initialTask?.dueDate,
        dueDateType: typeof initialTask?.dueDate,
      })
    } catch (error) {
      console.error('Error logging task data:', error)
      setRenderError('Ошибка загрузки данных задачи')
    }
  }, [])

  // Timer update effect - updates display every second when running
  useEffect(() => {
    if (!isTimerRunning) return

    const interval = setInterval(() => {
      // Force re-render to update displayed time
      setElapsedTime((prev) => prev)
    }, 1000)

    return () => clearInterval(interval)
  }, [isTimerRunning])

  const updateTaskField = useCallback(
    async (field: string, value: any) => {
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        })
        if (!res.ok) throw new Error('Ошибка обновления')
        setTask({ ...task, [field]: value })
        toast({ title: 'Сохранено', variant: 'success' })
      } catch (error) {
        toast({ title: 'Ошибка сохранения', variant: 'destructive' })
        throw error
      }
    },
    [task, toast]
  )

  const handleCreateSubtask = async () => {
    if (!newSubtask.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtask }),
      })
      if (!res.ok) throw new Error('Ошибка создания подзадачи')
      const subtask = await res.json()
      setTask({ ...task, subtasks: [...(task.subtasks || []), subtask] })
      setNewSubtask('')
      toast({ title: 'Подзадача создана', variant: 'success' })
    } catch (error) {
      toast({ title: 'Ошибка создания подзадачи', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      })
      if (!res.ok) throw new Error('Ошибка обновления')
      setTask({
        ...task,
        subtasks: task.subtasks.map((s: any) =>
          s.id === subtaskId ? { ...s, completed } : s
        ),
      })
    } catch (error) {
      toast({ title: 'Ошибка обновления', variant: 'destructive' })
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
          taskId: task.id,
          content: newComment,
        }),
      })
      if (!res.ok) throw new Error('Ошибка добавления комментария')
      const comment = await res.json()
      setTask({
        ...task,
        comments: [comment, ...(task.comments || [])],
      })
      setNewComment('')
      toast({ title: 'Комментарий добавлен', variant: 'success' })
    } catch (error) {
      toast({ title: 'Ошибка добавления комментария', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Timer handlers
  const startTimer = async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })

      if (!res.ok) {
        const error = await res.json()
        toast({ title: error.error || 'Ошибка запуска таймера', variant: 'destructive' })
        return
      }

      setIsTimerRunning(true)
      setTimerStart(new Date())
      toast({ title: 'Таймер запущен', variant: 'success' })
    } catch (error) {
      toast({ title: 'Ошибка запуска таймера', variant: 'destructive' })
    }
  }

  const pauseTimer = () => {
    if (timerStart) {
      const elapsed = Math.floor((new Date().getTime() - timerStart.getTime()) / 1000)
      setElapsedTime((prev) => prev + elapsed)
    }
    setIsTimerRunning(false)
    setTimerStart(null)
  }

  const stopTimer = async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      })

      if (!res.ok) {
        const error = await res.json()
        toast({ title: error.error || 'Ошибка остановки таймера', variant: 'destructive' })
        return
      }

      toast({ title: 'Время записано', variant: 'success' })
      setIsTimerRunning(false)
      setTimerStart(null)
      setElapsedTime(0)
    } catch (error) {
      toast({ title: 'Ошибка записи времени', variant: 'destructive' })
    }
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const getCurrentTime = () => {
    let total = elapsedTime
    if (timerStart) {
      total += Math.floor((new Date().getTime() - timerStart.getTime()) / 1000)
    }
    return formatTime(total)
  }

  const completedSubtasks = task.subtasks?.filter((s: any) => s.completed).length || 0
  const totalSubtasks = task.subtasks?.length || 0

  if (renderError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Ошибка загрузки</h2>
          </div>
          <p className="text-gray-700 mb-4">{renderError}</p>
          <Button onClick={() => router.push('/tasks')}>
            Вернуться к задачам
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 mb-2 text-sm">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 flex items-center">
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/tasks" className="text-gray-600 hover:text-gray-900">
              Задачи
            </Link>
                        <Link
              href={`/pain-radar?workspace=${workspace.id}`}
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Pain Radar
            </Link>
            {task.project && (
              <>
                <span className="text-gray-400">/</span>
                <Link href={`/projects/${task.project.id}`} className="text-gray-600 hover:text-gray-900">
                  {task.project.name}
                </Link>
              </>
            )}
          </div>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <InlineText
                value={task.title}
                onSave={(value) => updateTaskField('title', value)}
                className="text-2xl font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge className={taskStatusColors[task.status]}>
                {taskStatusLabels[task.status]}
              </Badge>
              <Badge className={priorityColors[task.priority]}>
                {priorityLabels[task.priority]}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Описание</h2>
              <InlineTextarea
                value={task.description || ''}
                onSave={(value) => updateTaskField('description', value)}
                placeholder="Добавьте описание задачи..."
                rows={4}
              />
            </div>

            {/* Subtasks */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Подзадачи</h2>
                {totalSubtasks > 0 && (
                  <span className="text-sm text-gray-500">
                    {completedSubtasks} / {totalSubtasks}
                  </span>
                )}
              </div>

              {totalSubtasks > 0 && (
                <ProgressBar
                  completed={completedSubtasks}
                  total={totalSubtasks}
                  showLabel={false}
                  size="sm"
                  className="mb-4"
                />
              )}

              <div className="space-y-2 mb-4">
                {task.subtasks?.map((subtask: any) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={(e) => handleToggleSubtask(subtask.id, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`flex-1 ${
                        subtask.completed ? 'line-through text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Добавить подзадачу..."
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSubtask()}
                />
                <Button
                  onClick={handleCreateSubtask}
                  disabled={!newSubtask.trim() || isSubmitting}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Comments */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Комментарии ({task.comments?.length || 0})
              </h2>

              <div className="mb-4">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Написать комментарий..."
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    onClick={handleCreateComment}
                    disabled={!newComment.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Отправить
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {task.comments?.map((comment: any) => (
                  <div key={comment.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {comment.author?.name || 'Неизвестный'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {(() => {
                          try {
                            if (!comment.createdAt) return ''
                            const date = new Date(comment.createdAt)
                            if (!isValid(date)) return ''
                            return format(date, 'd MMM yyyy, HH:mm', { locale: ru })
                          } catch {
                            return ''
                          }
                        })()}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
                {(!task.comments || task.comments.length === 0) && (
                  <p className="text-center text-gray-500 py-4">Нет комментариев</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timer */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Таймер
              </h3>
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-gray-900 mb-4">
                  {getCurrentTime()}
                </div>
                <div className="flex justify-center gap-2">
                  {!isTimerRunning ? (
                    <Button onClick={startTimer} size="sm" className="flex-1">
                      <Play className="h-4 w-4 mr-1" />
                      Старт
                    </Button>
                  ) : (
                    <Button onClick={pauseTimer} variant="outline" size="sm" className="flex-1">
                      <Pause className="h-4 w-4 mr-1" />
                      Пауза
                    </Button>
                  )}
                  <Button
                    onClick={stopTimer}
                    variant="destructive"
                    size="sm"
                    disabled={!isTimerRunning && elapsedTime === 0}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Детали</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500">Статус</Label>
                  <Select
                    value={task.status}
                    onValueChange={(v) => updateTaskField('status', v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(taskStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-gray-500">Приоритет</Label>
                  <Select
                    value={task.priority}
                    onValueChange={(v) => updateTaskField('priority', v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-gray-500">Исполнитель</Label>
                  <Select
                    value={task.assigneeId ?? ''}
                    onValueChange={(v) => updateTaskField('assigneeId', v || null)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Не назначен" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Не назначен</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-gray-500">Срок выполнения</Label>
                  <Input
                    type="date"
                    value={(() => {
                      try {
                        if (!task.dueDate || task.dueDate === 'null' || task.dueDate === '') return ''
                        const date = new Date(task.dueDate)
                        if (isNaN(date.getTime())) return ''
                        return format(date, 'yyyy-MM-dd')
                      } catch {
                        return ''
                      }
                    })()}
                    onChange={(e) => {
                      const value = e.target.value
                      if (!value) {
                        updateTaskField('dueDate', null)
                      } else {
                        // Convert YYYY-MM-DD to ISO DateTime
                        const date = new Date(value + 'T12:00:00.000Z')
                        updateTaskField('dueDate', date.toISOString())
                      }
                    }}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Project Info */}
            {task.project && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Проект
                </h3>
                <Link
                  href={`/projects/${task.project.id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {task.project.name}
                </Link>
                {task.project.client && (
                  <p className="text-sm text-gray-500 mt-1">
                    {task.project.client.name}
                  </p>
                )}
              </div>
            )}

            {/* Meta */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Информация</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Создано</span>
                  <span className="text-gray-900">
                    {task.createdAt ? format(new Date(task.createdAt), 'd MMM yyyy', { locale: ru }) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Автор</span>
                  <span className="text-gray-900">{task.createdBy?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Обновлено</span>
                  <span className="text-gray-900">
                    {task.updatedAt ? format(new Date(task.updatedAt), 'd MMM yyyy', { locale: ru }) : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
