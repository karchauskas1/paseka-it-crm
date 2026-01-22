'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/layout'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/lib/hooks/use-toast'
import {
  taskStatusLabels,
  taskStatusColors,
  priorityLabels,
  priorityColors,
} from '@/lib/validations/task'
import { TaskDetailDialog } from '@/components/tasks/task-detail-dialog'
import {
  Search,
  ArrowLeft,
  Calendar,
  User,
  FolderOpen,
  ArchiveRestore,
  Archive,
} from 'lucide-react'

interface TaskArchiveClientProps {
  user: any
  workspace: any
  tasks: any[]
  projects: any[]
  teamMembers: any[]
}

export default function TaskArchiveClient({
  user,
  workspace,
  tasks: initialTasks,
  projects,
  teamMembers,
}: TaskArchiveClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [tasks, setTasks] = useState(initialTasks)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [restoringTaskId, setRestoringTaskId] = useState<string | null>(null)

  const filteredTasks = tasks.filter((task) => {
    if (!task || !task.title) return false

    const matchesSearch = task.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesProject =
      filterProject === 'all' || task.projectId === filterProject
    const matchesAssignee =
      filterAssignee === 'all' || task.assigneeId === filterAssignee

    return matchesSearch && matchesProject && matchesAssignee
  })

  const handleRestore = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRestoringTaskId(taskId)

    try {
      const res = await fetch(`/api/tasks/${taskId}/archive`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка восстановления задачи')
      }

      setTasks(tasks.filter((t) => t.id !== taskId))
      toast({
        title: 'Задача восстановлена',
        description: 'Задача перемещена из архива',
        variant: 'success',
      })
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setRestoringTaskId(null)
    }
  }

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/tasks" userRole={user.role}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/tasks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Archive className="h-6 w-6" />
              Архив задач
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredTasks.length} из {tasks.length} архивных задач
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow p-3 sm:p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск задач..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger>
              <SelectValue placeholder="Проект" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все проекты</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger>
              <SelectValue placeholder="Исполнитель" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все исполнители</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {filteredTasks.length === 0 ? (
        <div className="bg-card rounded-lg shadow p-8 text-center text-muted-foreground">
          {tasks.length === 0 ? (
            <div>
              <Archive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">Архив пуст</p>
              <p className="text-sm mt-1">
                Выполненные задачи автоматически перемещаются сюда через 12 часов
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium">Ничего не найдено</p>
              <p className="text-sm mt-1">Попробуйте изменить параметры фильтрации</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-card rounded-lg shadow p-4 active:bg-muted transition-colors touch-manipulation"
                onClick={() => {
                  setSelectedTask(task)
                  setIsDetailDialogOpen(true)
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-foreground line-clamp-2">{task.title}</h3>
                  <Badge className={`${priorityColors[task.priority]} text-xs shrink-0`}>
                    {priorityLabels[task.priority]}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {task.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={`${taskStatusColors[task.status]} text-xs`}>
                    {taskStatusLabels[task.status]}
                  </Badge>
                  {task.project && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {task.project.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {task.assignee ? task.assignee.name : 'Не назначен'}
                  </span>
                  {task.archivedAt && (
                    <span className="flex items-center gap-1">
                      <Archive className="h-3 w-3" />
                      {new Date(task.archivedAt).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => handleRestore(task.id, e)}
                  disabled={restoringTaskId === task.id}
                >
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  {restoringTaskId === task.id ? 'Восстановление...' : 'Восстановить'}
                </Button>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Задача
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Проект
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Исполнитель
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Архивирован
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedTask(task)
                        setIsDetailDialogOpen(true)
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.project ? (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <FolderOpen className="h-4 w-4 mr-1" />
                            {task.project.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={taskStatusColors[task.status]}>
                          {taskStatusLabels[task.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.assignee ? (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <User className="h-4 w-4 mr-1" />
                            {task.assignee.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Не назначен</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {task.archivedAt ? (
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(task.archivedAt).toLocaleDateString('ru-RU')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleRestore(task.id, e)}
                          disabled={restoringTaskId === task.id}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-1" />
                          {restoringTaskId === task.id ? '...' : 'Восстановить'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        isOpen={isDetailDialogOpen}
        onClose={() => {
          setIsDetailDialogOpen(false)
          setSelectedTask(null)
        }}
        projects={projects}
        users={teamMembers}
        onTaskDeleted={(taskId) => {
          setTasks(tasks.filter((t) => t.id !== taskId))
        }}
        onTaskArchived={(taskId) => {
          // В архиве: восстановление = удаление из списка архива
          setTasks(tasks.filter((t) => t.id !== taskId))
        }}
        onTaskUpdated={(updatedTask) => {
          setTasks(tasks.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)))
        }}
      />
    </AppLayout>
  )
}
