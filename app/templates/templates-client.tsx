'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Home,
  FileText,
  CheckSquare,
  Flag,
  Plus,
  MoreVertical,
  Trash2,
  Copy,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

interface Template {
  id: string
  name: string
  description: string | null
  type: string
  createdAt: string
  _count: {
    tasks: number
    milestones: number
  }
}

interface Client {
  id: string
  name: string
}

interface TemplatesClientProps {
  user: any
  workspace: any
  templates: Template[]
  clients: Client[]
}

const typeLabels: Record<string, string> = {
  CONSULTING: 'Консалтинг',
  DEVELOPMENT: 'Разработка',
  DESIGN: 'Дизайн',
  MARKETING: 'Маркетинг',
  OTHER: 'Другое',
}

export default function TemplatesClient({
  user,
  workspace,
  templates,
  clients,
}: TemplatesClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null)

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !newProjectName.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/projects/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          name: newProjectName.trim(),
          clientId: selectedClientId || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Ошибка создания проекта')
      }

      const project = await res.json()
      toast.success('Проект создан из шаблона')
      router.push(`/projects/${project.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка создания проекта')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return

    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${templateToDelete.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Ошибка удаления шаблона')
      }

      toast.success('Шаблон удалён')
      router.refresh()
    } catch (error) {
      toast.error('Ошибка удаления шаблона')
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
    }
  }

  const openCreateDialog = (template: Template) => {
    setSelectedTemplate(template)
    setNewProjectName(template.name)
    setSelectedClientId('')
    setCreateDialogOpen(true)
  }

  const openDeleteDialog = (template: Template) => {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm">
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 flex items-center">
                  <Home className="h-4 w-4 mr-1" />
                  Dashboard
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900">Шаблоны</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Шаблоны проектов</h1>
              <p className="text-sm text-gray-600">{workspace.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{user.name}</span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Выйти
              </Button>
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
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Задачи
            </Link>
            <Link
              href="/templates"
              className="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600"
            >
              Шаблоны
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск шаблонов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow border overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <span className="text-xs text-gray-500">
                          {typeLabels[template.type] || template.type}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openCreateDialog(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Создать проект
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(template)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {template.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <CheckSquare className="h-4 w-4" />
                      <span>{template._count.tasks} задач</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flag className="h-4 w-4" />
                      <span>{template._count.milestones} вех</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Button
                      onClick={() => openCreateDialog(template)}
                      className="w-full"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Создать проект из шаблона
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">
              {searchQuery ? 'Шаблоны не найдены' : 'Шаблонов пока нет'}
            </p>
            <p className="text-sm text-gray-400">
              Создайте шаблон из существующего проекта на странице проекта
            </p>
          </div>
        )}
      </main>

      {/* Create from Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать проект из шаблона</DialogTitle>
            <DialogDescription>
              Шаблон: {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Название проекта</Label>
              <Input
                id="projectName"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Введите название проекта"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Клиент (опционально)</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Без клиента</SelectItem>
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
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreateFromTemplate}
              disabled={loading || !newProjectName.trim()}
            >
              {loading ? 'Создание...' : 'Создать проект'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить шаблон</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить шаблон "{templateToDelete?.name}"?
              Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={loading}
            >
              {loading ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
