'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'
import {
  projectTypeLabels,
  priorityLabels,
} from '@/lib/validations/project'
import { ArrowLeft, Plus, Users } from 'lucide-react'

interface CreateProjectClientProps {
  user: any
  workspace: any
  clients: any[]
}

export default function CreateProjectClient({
  user,
  workspace,
  clients,
}: CreateProjectClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientCompany, setNewClientCompany] = useState('')
  const [clientsList, setClientsList] = useState(clients)

  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    type: 'MONEY',
    priority: 'MEDIUM',
    description: '',
    budget: '',
    startDate: '',
    endDatePlan: '',
  })

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          company: newClientCompany,
          workspaceId: workspace.id,
        }),
      })

      if (!res.ok) throw new Error('Ошибка создания клиента')

      const newClient = await res.json()
      setClientsList([...clientsList, newClient])
      setFormData({ ...formData, clientId: newClient.id })
      setIsClientDialogOpen(false)
      setNewClientName('')
      setNewClientCompany('')
      toast({
        title: 'Клиент создан',
        description: newClient.name,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать клиента',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Укажите название проекта',
        variant: 'destructive',
      })
      return
    }

    if (!formData.clientId) {
      toast({
        title: 'Ошибка',
        description: 'Выберите клиента',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          workspaceId: workspace.id,
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          startDate: formData.startDate || undefined,
          endDatePlan: formData.endDatePlan || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка создания проекта')
      }

      const project = await res.json()
      toast({
        title: 'Проект создан',
        description: project.name,
        variant: 'success',
      })
      router.push(`/projects/${project.id}`)
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

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">PASEKA IT CRM</h1>
              <p className="text-sm text-muted-foreground">{workspace.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-foreground">{user.name}</span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/dashboard"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-muted-foreground hover:text-foreground hover:border-border"
            >
              Dashboard
            </Link>
            <Link
              href="/projects"
              className="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600"
            >
              Проекты
            </Link>
            <Link
              href="/clients"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-muted-foreground hover:text-foreground hover:border-border"
            >
              Клиенты
            </Link>
            <Link
              href="/tasks"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-muted-foreground hover:text-foreground hover:border-border"
            >
              Задачи
            </Link>
                      <Link
              href={`/pain-radar?workspace=${workspace.id}`}
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-muted-foreground hover:text-foreground hover:border-border"
            >
              Pain Radar
            </Link>
            </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/projects"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад к проектам
          </Link>
          <h2 className="text-2xl font-bold text-foreground">Новый проект</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Заполните информацию о проекте
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-card rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Основная информация</h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Название проекта *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Например: Разработка CRM системы"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>Клиент *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.clientId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, clientId: value })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Выберите клиента" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientsList.length === 0 ? (
                        <div className="p-2 text-center text-muted-foreground text-sm">
                          Нет клиентов
                        </div>
                      ) : (
                        clientsList.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                            {client.company && ` (${client.company})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsClientDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Тип проекта</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(projectTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
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
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Краткое описание проекта..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Budget & Dates */}
          <div className="bg-card rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Бюджет и сроки</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="budget">Бюджет (руб.)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  placeholder="100000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startDate">Дата старта</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDatePlan">Дата завершения (план)</Label>
                <Input
                  id="endDatePlan"
                  type="date"
                  value={formData.endDatePlan}
                  onChange={(e) =>
                    setFormData({ ...formData, endDatePlan: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/projects')}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Создание...' : 'Создать проект'}
            </Button>
          </div>
        </form>
      </main>

      {/* Create Client Dialog */}
      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый клиент</DialogTitle>
            <DialogDescription>
              Быстрое создание клиента для проекта
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="clientName">Имя *</Label>
              <Input
                id="clientName"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Иван Петров"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clientCompany">Компания</Label>
              <Input
                id="clientCompany"
                value={newClientCompany}
                onChange={(e) => setNewClientCompany(e.target.value)}
                placeholder="ООО Компания"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsClientDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button onClick={handleCreateClient} disabled={!newClientName.trim()}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
