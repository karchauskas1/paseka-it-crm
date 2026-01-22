'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/lib/hooks/use-toast'
import {
  taskStatusLabels,
  taskStatusColors,
  priorityLabels,
  priorityColors,
  complexityLabels,
} from '@/lib/validations/task'
import { Calendar, User, FolderOpen, Trash2, Save, Archive, ArchiveRestore } from 'lucide-react'
import { TimeTracker } from './time-tracker'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  complexity?: string
  dueDate?: string
  projectId?: string
  assigneeId?: string
  project?: { id: string; name: string } | null
  assignee?: { id: string; name: string } | null
  isArchived?: boolean
  archivedAt?: string
}

interface TaskDetailDialogProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  projects: Array<{ id: string; name: string }>
  users: Array<{ id: string; name: string }>
}

export function TaskDetailDialog({
  task,
  isOpen,
  onClose,
  projects,
  users,
}: TaskDetailDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    complexity: 'MEDIUM',
    dueDate: '',
    projectId: '',
    assigneeId: '',
  })

  // Update formData when task changes
  useEffect(() => {
    if (task) {
      // Parse dueDate properly - handle both ISO string and date string formats
      let dueDateValue = ''
      if (task.dueDate) {
        try {
          const date = new Date(task.dueDate)
          if (!isNaN(date.getTime())) {
            dueDateValue = date.toISOString().split('T')[0]
          }
        } catch {
          dueDateValue = ''
        }
      }

      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        complexity: task.complexity || 'MEDIUM',
        dueDate: dueDateValue,
        projectId: task.projectId || '',
        assigneeId: task.assigneeId || '',
      })
    }
  }, [task?.id])

  const handleUpdate = async () => {
    if (!task) return

    setIsLoading(true)
    try {
      // Prepare dueDate - ensure proper ISO format
      let dueDateISO: string | null = null
      if (formData.dueDate) {
        try {
          // Parse date as local date (yyyy-mm-dd format from input type="date")
          const [year, month, day] = formData.dueDate.split('-').map(Number)
          const date = new Date(year, month - 1, day, 12, 0, 0) // noon to avoid timezone issues
          if (!isNaN(date.getTime())) {
            dueDateISO = date.toISOString()
          }
        } catch {
          dueDateISO = null
        }
      }

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dueDate: dueDateISO,
          projectId: formData.projectId || null,
          assigneeId: formData.assigneeId || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка обновления задачи')
      }

      toast({
        title: 'Задача обновлена',
        description: 'Изменения сохранены',
        variant: 'success',
      })
      router.refresh()
      onClose()
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
    if (!task) return
    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка удаления задачи')
      }

      toast({
        title: 'Задача удалена',
        variant: 'success',
      })
      router.refresh()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleArchive = async () => {
    if (!task) return

    setIsArchiving(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/archive`, {
        method: task.isArchived ? 'DELETE' : 'POST',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка архивации задачи')
      }

      toast({
        title: task.isArchived ? 'Задача восстановлена' : 'Задача архивирована',
        variant: 'success',
      })
      router.refresh()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsArchiving(false)
    }
  }

  if (!task) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детали задачи</DialogTitle>
          <DialogDescription>
            Просмотр и редактирование задачи
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Название */}
          <div className="grid gap-2">
            <Label htmlFor="title">Название *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Название задачи"
            />
          </div>

          {/* Описание */}
          <div className="grid gap-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание задачи..."
              rows={4}
            />
          </div>

          {/* Статус и Приоритет */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Статус</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
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

            <div className="grid gap-2">
              <Label htmlFor="priority">Приоритет</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите приоритет" />
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
          </div>

          {/* Сложность и Дата */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="complexity">Сложность</Label>
              <Select
                value={formData.complexity}
                onValueChange={(value) => setFormData({ ...formData, complexity: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сложность" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(complexityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate">Срок выполнения</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          {/* Проект и Исполнитель */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="project">Проект</Label>
              <Select
                value={formData.projectId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, projectId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите проект" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без проекта</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assignee">Исполнитель</Label>
              <Select
                value={formData.assigneeId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, assigneeId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите исполнителя" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не назначен</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Time Tracking */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium mb-3">Трекинг времени</h3>
          <TimeTracker taskId={task.id} />
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleArchive}
              disabled={isArchiving}
            >
              {task.isArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  {isArchiving ? 'Восстановление...' : 'Восстановить'}
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  {isArchiving ? 'Архивация...' : 'В архив'}
                </>
              )}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="button" onClick={handleUpdate} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
