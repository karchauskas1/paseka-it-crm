'use client'

import { useState } from 'react'
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
import { useToast } from '@/lib/hooks/use-toast'
import {
  feedbackTypeLabels,
  feedbackStatusLabels,
  feedbackTypeColors,
  feedbackStatusColors,
} from '@/lib/validations/feedback'
import { priorityLabels, priorityColors } from '@/lib/validations/task'
import { Plus, Search, User, Calendar, Trash2, ImageIcon, X } from 'lucide-react'

interface FeedbackClientProps {
  user: any
  workspace: any
  feedback: any[]
}

export default function FeedbackClient({
  user,
  workspace,
  feedback: initialFeedback,
}: FeedbackClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [feedback, setFeedback] = useState(initialFeedback)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    type: 'BUG',
    title: '',
    description: '',
    priority: 'MEDIUM',
  })

  // Detail modal state
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const filteredFeedback = feedback.filter((item) => {
    if (!item || !item.title) return false

    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = filterType === 'all' || item.type === filterType
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus

    return matchesSearch && matchesType && matchesStatus
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          workspaceId: workspace.id,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка создания обратной связи')
      }

      const newFeedback = await res.json()
      setFeedback([newFeedback.feedback, ...feedback])
      setIsDialogOpen(false)
      setFormData({
        type: 'BUG',
        title: '',
        description: '',
        priority: 'MEDIUM',
      })
      toast({
        title: 'Обратная связь создана',
        description: 'Спасибо за ваш отзыв!',
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

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        throw new Error('Ошибка обновления статуса')
      }

      setFeedback(
        feedback.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      )
      toast({
        title: 'Статус обновлен',
        variant: 'success',
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) return

    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка удаления')
      }

      setFeedback(feedback.filter((item) => item.id !== id))
      toast({
        title: 'Запись удалена',
        variant: 'success',
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const isAdmin = user.role === 'ADMIN' || user.role === 'OWNER'

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/feedback" userRole={user.role}>
      <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Обратная связь</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Баги, предложения и улучшения
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Новая обратная связь</DialogTitle>
                  <DialogDescription>
                    Сообщите о баге или предложите улучшение
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Тип *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(feedbackTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="title">Заголовок *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Краткое описание проблемы или предложения"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Описание *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Подробное описание..."
                      rows={4}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Приоритет</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData({ ...formData, priority: value })
                      }
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

        {/* Filters */}
        <div className="bg-card rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {Object.entries(feedbackTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(feedbackStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Feedback List */}
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Заголовок
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Приоритет
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Автор
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">

                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Действия
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredFeedback.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-6 py-12">
                    <div className="text-center text-muted-foreground">
                      {feedback.length === 0 ? (
                        <div>
                          <p className="text-lg font-medium">
                            Пока нет обратной связи
                          </p>
                          <p className="text-sm mt-1">
                            Создайте первую запись
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
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFeedback.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedFeedback(item)
                      setIsDetailOpen(true)
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={feedbackTypeColors[item.type]}>
                        {feedbackTypeLabels[item.type]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {isAdmin ? (
                        <Select
                          value={item.status}
                          onValueChange={(value) =>
                            handleStatusChange(item.id, value)
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(feedbackStatusLabels).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={feedbackStatusColors[item.status]}>
                          {feedbackStatusLabels[item.status]}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.priority && (
                        <Badge className={priorityColors[item.priority]}>
                          {priorityLabels[item.priority]}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <User className="h-4 w-4 mr-1" />
                        {item.createdBy.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {item.screenshot && (
                          <div className="flex items-center" title="Есть скриншот">
                            <ImageIcon className="h-4 w-4 text-blue-500" />
                          </div>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            {selectedFeedback && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <Badge className={feedbackTypeColors[selectedFeedback.type]}>
                      {feedbackTypeLabels[selectedFeedback.type]}
                    </Badge>
                    {selectedFeedback.priority && (
                      <Badge className={priorityColors[selectedFeedback.priority]}>
                        {priorityLabels[selectedFeedback.priority]}
                      </Badge>
                    )}
                    <Badge className={feedbackStatusColors[selectedFeedback.status]}>
                      {feedbackStatusLabels[selectedFeedback.status]}
                    </Badge>
                  </div>
                  <DialogTitle className="text-xl mt-2">
                    {selectedFeedback.title}
                  </DialogTitle>
                  <DialogDescription>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {selectedFeedback.createdBy?.name || 'Неизвестный'}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(selectedFeedback.createdAt).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Описание</h4>
                    <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-4 leading-relaxed">
                      {selectedFeedback.description}
                    </div>
                  </div>

                  {selectedFeedback.screenshot && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Скриншот
                      </h4>
                      <div className="border rounded-lg overflow-hidden">
                        <img
                          src={selectedFeedback.screenshot}
                          alt="Скриншот"
                          className="w-full h-auto cursor-pointer"
                          onClick={() => window.open(selectedFeedback.screenshot, '_blank')}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Нажмите на изображение чтобы открыть в полном размере
                      </p>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="pt-4 border-t">
                      <Label className="mb-2 block">Изменить статус</Label>
                      <Select
                        value={selectedFeedback.status}
                        onValueChange={(value) => {
                          handleStatusChange(selectedFeedback.id, value)
                          setSelectedFeedback({ ...selectedFeedback, status: value })
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(feedbackStatusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-4">
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                    Закрыть
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
    </AppLayout>
  )
}
