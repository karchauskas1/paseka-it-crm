'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { AppLayout } from '@/components/layout'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/lib/hooks/use-toast'
import {
  taskStatusLabels,
  taskStatusColors,
  priorityLabels,
  priorityColors,
} from '@/lib/validations/task'
import KanbanBoard from '@/components/views/kanban-board'
import { TaskDetailDialog } from '@/components/tasks/task-detail-dialog'
import { useUserSettings } from '@/lib/hooks/use-user-settings'
import {
  Plus,
  Search,
  List,
  LayoutGrid,
  Calendar,
  User,
  FolderOpen,
  Archive,
} from 'lucide-react'

interface TasksClientProps {
  user: any
  workspace: any
  tasks: any[]
  projects: any[]
  teamMembers: any[]
}

export default function TasksClient({
  user,
  workspace,
  tasks: initialTasks,
  projects,
  teamMembers,
}: TasksClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { settings, updateSetting, mounted } = useUserSettings()
  const [tasks, setTasks] = useState(initialTasks)
  const [view, setView] = useState<'table' | 'kanban'>('table')

  // Sync view with user settings
  useEffect(() => {
    if (mounted && settings.tasksView) {
      setView(settings.tasksView)
    }
  }, [mounted, settings.tasksView])

  const handleViewChange = (newView: 'table' | 'kanban') => {
    setView(newView)
    updateSetting('tasksView', newView)
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    status: 'TODO',
    priority: 'MEDIUM',
    assigneeId: '',
    dueDate: '',
  })

  const filteredTasks = tasks.filter((task) => {
    if (!task || !task.title) return false

    const matchesSearch = task.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    const matchesPriority =
      filterPriority === 'all' || task.priority === filterPriority
    const matchesProject =
      filterProject === 'all' || task.projectId === filterProject
    const matchesAssignee =
      filterAssignee === 'all' || task.assigneeId === filterAssignee

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesProject &&
      matchesAssignee
    )
  })

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          workspaceId: workspace.id,
          projectId: formData.projectId && formData.projectId !== 'none' ? formData.projectId : undefined,
          assigneeId: formData.assigneeId && formData.assigneeId !== 'none' ? formData.assigneeId : undefined,
          dueDate: formData.dueDate || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка создания задачи')
      }

      const newTask = await res.json()
      setTasks([
        {
          ...newTask,
          project: projects.find((p) => p.id === newTask.projectId) || null,
          assignee:
            teamMembers.find((m) => m.id === newTask.assigneeId) || null,
          _count: { subtasks: 0, comments: 0 },
        },
        ...tasks,
      ])
      setIsDialogOpen(false)
      setFormData({
        title: '',
        description: '',
        projectId: '',
        status: 'TODO',
        priority: 'MEDIUM',
        assigneeId: '',
        dueDate: '',
      })
      toast({
        title: 'Задача создана',
        description: newTask.title,
        variant: 'success',
      })
      router.refresh()
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

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Ошибка обновления')

      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      )

      toast({
        title: 'Статус обновлён',
        description: `Задача перемещена в "${taskStatusLabels[newStatus]}"`,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус',
        variant: 'destructive',
      })
    }
  }

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/tasks" userRole={user.role}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Задачи</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredTasks.length} из {tasks.length} задач
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link href="/tasks/archive">
            <Button variant="outline" size="sm">
              <Archive className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Архив</span>
            </Button>
          </Link>
          <Tabs
            value={view}
            onValueChange={(v) => handleViewChange(v as 'table' | 'kanban')}
          >
            <TabsList className="h-9">
              <TabsTrigger value="table" className="text-xs sm:text-sm">
                <List className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Таблица</span>
              </TabsTrigger>
              <TabsTrigger value="kanban" className="text-xs sm:text-sm">
                <LayoutGrid className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Kanban</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="sm:size-default">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Создать задачу</span>
              </Button>
            </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Новая задача</DialogTitle>
                    <DialogDescription>
                      Создайте новую задачу для команды
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Название *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder="Что нужно сделать?"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Описание</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Подробное описание задачи..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Проект</Label>
                        <Select
                          value={formData.projectId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, projectId: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Без проекта" />
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
                        <Label>Исполнитель</Label>
                        <Select
                          value={formData.assigneeId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, assigneeId: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Не назначен" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не назначен</SelectItem>
                            {teamMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
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
                            {Object.entries(taskStatusLabels).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Приоритет</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) =>
                            setFormData({ ...formData, priority: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorityLabels).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Срок</Label>
                        <Input
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) =>
                            setFormData({ ...formData, dueDate: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Отмена
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Создание...' : 'Создать'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow p-3 sm:p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск задач..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(taskStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Приоритет" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все приоритеты</SelectItem>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        {view === 'table' ? (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="bg-card rounded-lg shadow p-8 text-center text-muted-foreground">
                  {tasks.length === 0 ? (
                    <div>
                      <List className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-lg font-medium">Нет задач</p>
                      <p className="text-sm mt-1">Создайте первую задачу</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium">Ничего не найдено</p>
                      <p className="text-sm mt-1">Измените параметры фильтрации</p>
                    </div>
                  )}
                </div>
              ) : (
                filteredTasks.map((task) => (
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
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
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
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.assignee ? task.assignee.name : 'Не назначен'}
                      </span>
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
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
                        Приоритет
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Исполнитель
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Срок
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-12 text-center text-muted-foreground"
                        >
                          {tasks.length === 0 ? (
                            <div>
                              <List className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                              <p className="text-lg font-medium">Нет задач</p>
                              <p className="text-sm mt-1">
                                Создайте первую задачу, чтобы начать работу
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-lg font-medium">
                                Ничего не найдено
                              </p>
                              <p className="text-sm mt-1">
                                Попробуйте изменить параметры фильтрации
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => (
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
                            <Badge className={priorityColors[task.priority]}>
                              {priorityLabels[task.priority]}
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
                            {task.dueDate ? (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <KanbanBoard
            tasks={filteredTasks}
            onStatusChange={handleStatusChange}
            onTaskClick={(task) => {
              setSelectedTask(task)
              setIsDetailDialogOpen(true)
            }}
          />
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
          setTasks(tasks.filter((t) => t.id !== taskId))
        }}
        onTaskUpdated={(updatedTask) => {
          setTasks(tasks.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)))
        }}
      />
    </AppLayout>
  )
}
