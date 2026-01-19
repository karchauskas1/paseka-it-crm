'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { UserMenu } from '@/components/layout/user-menu'
import { NotificationBell } from '@/components/notifications/notification-bell'
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
import { FeedbackButton } from '@/components/feedback'
import {
  Plus,
  Search,
  List,
  LayoutGrid,
  Calendar,
  User,
  FolderOpen,
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
  const [tasks, setTasks] = useState(initialTasks)
  const [view, setView] = useState<'table' | 'kanban'>('table')
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
              <NotificationBell />
              <UserMenu user={user} workspace={workspace} userRole={user.role} />
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
              className="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600"
            >
              Задачи
            </Link>
            <Link
              href="/calendar"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Календарь
            </Link>
            <Link
              href="/activity"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Активность
            </Link>
            {(user.role === 'ADMIN' || user.role === 'OWNER') && (
              <Link
                href="/admin"
                className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Администрирование
              </Link>
            )}
            <Link
              href="/guide"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Гайд
            </Link>
            <div className="flex-1" />
            <div className="flex items-center py-2">
              <FeedbackButton workspaceId={workspace.id} />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Задачи</h2>
            <p className="mt-1 text-sm text-gray-600">
              {filteredTasks.length} из {tasks.length} задач
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs
              value={view}
              onValueChange={(v) => setView(v as 'table' | 'kanban')}
            >
              <TabsList>
                <TabsTrigger value="table">
                  <List className="h-4 w-4 mr-1" />
                  Таблица
                </TabsTrigger>
                <TabsTrigger value="kanban">
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Kanban
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать задачу
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
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Задача
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Проект
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Приоритет
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Исполнитель
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Срок
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {tasks.length === 0 ? (
                        <div>
                          <List className="h-12 w-12 mx-auto text-gray-300 mb-4" />
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
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedTask(task)
                        setIsDetailDialogOpen(true)
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.project ? (
                          <div className="flex items-center text-sm text-gray-600">
                            <FolderOpen className="h-4 w-4 mr-1" />
                            {task.project.name}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
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
                          <div className="flex items-center text-sm text-gray-600">
                            <User className="h-4 w-4 mr-1" />
                            {task.assignee.name}
                          </div>
                        ) : (
                          <span className="text-gray-400">Не назначен</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.dueDate ? (
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
        />
      </main>
    </div>
  )
}
