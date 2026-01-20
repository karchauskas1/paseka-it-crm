'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { TaskDetailDialog } from '@/components/tasks/task-detail-dialog'
import { useToast } from '@/lib/hooks/use-toast'

interface Event {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
  type: string
  project: { id: string; name: string } | null
  task: { id: string; title: string } | null
  client: { id: string; name: string } | null
  createdBy: { id: string; name: string }
}

interface CalendarClientProps {
  user: any
  workspace: any
  projects: Array<{ id: string; name: string }>
  clients: Array<{ id: string; name: string }>
}

const eventTypeColors: Record<string, string> = {
  MEETING: 'bg-blue-500',
  REMINDER: 'bg-yellow-500',
  DEADLINE: 'bg-red-500',
  TASK_DUE: 'bg-orange-500',
  MILESTONE: 'bg-purple-500',
}

const eventTypeLabels: Record<string, string> = {
  MEETING: 'Встреча',
  REMINDER: 'Напоминание',
  DEADLINE: 'Дедлайн',
  TASK_DUE: 'Срок задачи',
  MILESTONE: 'Веха',
}

export default function CalendarClient({
  user,
  workspace,
  projects,
  clients,
}: CalendarClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    allDay: false,
    type: 'MEETING',
    projectId: '',
    clientId: '',
  })

  // Fetch events for current month
  const fetchEvents = async () => {
    setLoading(true)
    try {
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)

      const params = new URLSearchParams({
        from: start.toISOString(),
        to: end.toISOString(),
      })

      if (typeFilter !== 'ALL') {
        params.set('type', typeFilter)
      }

      const res = await fetch(`/api/events?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
    fetchTeamMembers()
  }, [currentDate, typeFilter])

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/workspace/members')
      if (res.ok) {
        const data = await res.json()
        setTeamMembers(data.members.map((m: any) => ({ id: m.user.id, name: m.user.name })))
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error)
    }
  }

  const handleEventClick = async (event: Event, e: React.MouseEvent) => {
    e.stopPropagation()

    // If it's a task event, fetch and open the task detail
    if (event.type === 'TASK_DUE' && event.task?.id) {
      try {
        const res = await fetch(`/api/tasks/${event.task.id}`)
        if (res.ok) {
          const data = await res.json()
          setSelectedTask(data.task)
          setIsTaskDetailOpen(true)
        } else {
          toast({
            title: 'Ошибка',
            description: 'Не удалось загрузить задачу',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить задачу',
          variant: 'destructive',
        })
      }
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    setNewEvent({
      ...newEvent,
      startDate: format(day, "yyyy-MM-dd'T'HH:mm"),
      endDate: '',
    })
    setIsDialogOpen(true)
  }

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.startDate) return

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          projectId: newEvent.projectId && newEvent.projectId !== 'none' ? newEvent.projectId : null,
          clientId: newEvent.clientId && newEvent.clientId !== 'none' ? newEvent.clientId : null,
        }),
      })

      if (res.ok) {
        setIsDialogOpen(false)
        setNewEvent({
          title: '',
          description: '',
          startDate: '',
          endDate: '',
          allDay: false,
          type: 'MEETING',
          projectId: '',
          clientId: '',
        })
        fetchEvents()
      }
    } catch (error) {
      console.error('Failed to create event:', error)
    }
  }

  // Calendar grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { locale: ru })
  const calendarEnd = endOfWeek(monthEnd, { locale: ru })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {}
    events.forEach((event) => {
      const dateKey = format(new Date(event.startDate), 'yyyy-MM-dd')
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
    })
    return grouped
  }, [events])

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/calendar" userRole={user.role}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Сегодня
            </Button>
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentDate, 'LLLL yyyy', { locale: ru })}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Тип события" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все типы</SelectItem>
                {Object.entries(eventTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => { setSelectedDate(new Date()); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить событие
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day) => (
              <div
                key={day}
                className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayEvents = eventsByDate[dateKey] || []
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isTodayDate = isToday(day)

              return (
                <div
                  key={index}
                  className={`min-h-[120px] border-b border-r p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !isCurrentMonth ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-medium ${
                        isTodayDate
                          ? 'h-6 w-6 flex items-center justify-center rounded-full bg-blue-600 text-white'
                          : isCurrentMonth
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs px-1.5 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80 ${
                          eventTypeColors[event.type] || 'bg-gray-500'
                        }`}
                        title={event.title}
                        onClick={(e) => handleEventClick(event, e)}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 px-1.5">
                        +{dayEvents.length - 3} ещё
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
      <div className="mt-4 flex items-center gap-4 flex-wrap">
        {Object.entries(eventTypeLabels).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${eventTypeColors[type]}`} />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Create Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Создать событие</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Название события"
              />
            </div>

            <div>
              <Label htmlFor="type">Тип</Label>
              <Select
                value={newEvent.type}
                onValueChange={(v) => setNewEvent({ ...newEvent, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Дата и время</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={newEvent.startDate}
                onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Описание события"
              />
            </div>

            <div>
              <Label htmlFor="project">Проект (опционально)</Label>
              <Select
                value={newEvent.projectId}
                onValueChange={(v) => setNewEvent({ ...newEvent, projectId: v })}
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

            <div>
              <Label htmlFor="client">Клиент (опционально)</Label>
              <Select
                value={newEvent.clientId}
                onValueChange={(v) => setNewEvent({ ...newEvent, clientId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без клиента</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateEvent} disabled={!newEvent.title || !newEvent.startDate}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        isOpen={isTaskDetailOpen}
        onClose={() => {
          setIsTaskDetailOpen(false)
          setSelectedTask(null)
          fetchEvents() // Refresh events after task update
        }}
        projects={projects}
        users={teamMembers}
      />
    </AppLayout>
  )
}
