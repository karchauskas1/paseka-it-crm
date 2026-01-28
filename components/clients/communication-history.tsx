'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { useToast } from '@/lib/hooks/use-toast'
import {
  Phone,
  Mail,
  Users,
  StickyNote,
  Plus,
  Loader2,
  Calendar,
} from 'lucide-react'

interface Communication {
  id: string
  type: string
  subject: string | null
  content: string
  date: string
  createdBy: { id: string; name: string }
}

interface CommunicationHistoryProps {
  clientId: string
}

const typeIcons: Record<string, React.ReactNode> = {
  CALL: <Phone className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
  MEETING: <Users className="h-4 w-4" />,
  NOTE: <StickyNote className="h-4 w-4" />,
}

const typeLabels: Record<string, string> = {
  CALL: 'Звонок',
  EMAIL: 'Email',
  MEETING: 'Встреча',
  NOTE: 'Заметка',
}

const typeColors: Record<string, string> = {
  CALL: 'bg-green-100 text-green-700',
  EMAIL: 'bg-blue-100 text-blue-700',
  MEETING: 'bg-purple-100 text-purple-700',
  NOTE: 'bg-muted text-foreground',
}

export function CommunicationHistory({ clientId }: CommunicationHistoryProps) {
  const { toast } = useToast()
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterType, setFilterType] = useState('ALL')

  const [form, setForm] = useState({
    type: 'CALL',
    subject: '',
    content: '',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  })

  useEffect(() => {
    fetchCommunications()
  }, [clientId, filterType])

  const fetchCommunications = async (loadMore = false) => {
    if (!loadMore) setLoading(true)
    try {
      const offset = loadMore ? communications.length : 0
      const typeParam = filterType !== 'ALL' ? `&type=${filterType}` : ''
      const res = await fetch(
        `/api/clients/${clientId}/communications?limit=20&offset=${offset}${typeParam}`
      )
      if (res.ok) {
        const data = await res.json()
        setCommunications(loadMore ? [...communications, ...data.communications] : data.communications)
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Failed to fetch communications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.content.trim()) {
      toast({ title: 'Введите содержание', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          subject: form.subject || null,
          content: form.content,
          date: form.date,
        }),
      })

      if (!res.ok) throw new Error('Ошибка создания')

      const newCommunication = await res.json()
      setCommunications([newCommunication, ...communications])
      setIsDialogOpen(false)
      setForm({
        type: 'CALL',
        subject: '',
        content: '',
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      })
      toast({ title: 'Запись добавлена', variant: 'success' })
    } catch (error) {
      toast({ title: 'Ошибка создания записи', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все типы</SelectItem>
            {Object.entries(typeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить запись
        </Button>
      </div>

      {/* List */}
      {communications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <StickyNote className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Нет записей о коммуникациях</p>
          <Button
            onClick={() => setIsDialogOpen(true)}
            variant="outline"
            className="mt-4"
          >
            Добавить первую запись
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {communications.map((comm) => (
            <div
              key={comm.id}
              className="bg-card rounded-lg shadow border p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      typeColors[comm.type]
                    }`}
                  >
                    {typeIcons[comm.type]}
                    {typeLabels[comm.type]}
                  </span>
                  {comm.subject && (
                    <span className="font-medium text-foreground">{comm.subject}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(comm.date), 'd MMM yyyy, HH:mm', { locale: ru })}
                </div>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{comm.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {comm.createdBy.name}
              </p>
            </div>
          ))}

          {hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => fetchCommunications(true)}
              >
                Загрузить ещё
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая запись</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Тип</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Дата и время</Label>
                <Input
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Тема (опционально)</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Тема коммуникации"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Содержание *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Опишите коммуникацию..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
