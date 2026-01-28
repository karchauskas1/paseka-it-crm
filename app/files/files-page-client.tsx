'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  HardDrive,
  Search,
  Download,
  Trash2,
  ExternalLink,
  FolderOpen,
  FileText,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'

interface FilesPageClientProps {
  projects: any[]
  user: any
  workspace: any
  totalFiles: number
  totalSize: number
}

export default function FilesPageClient({
  projects: initialProjects,
  user,
  workspace,
  totalFiles,
  totalSize,
}: FilesPageClientProps) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categoryLabels: Record<string, string> = {
    REFERENCE: 'Референс',
    DESIGN: 'Дизайн',
    DOCUMENT: 'Документ',
    CODE: 'Код',
    ASSET: 'Ассет',
    OTHER: 'Другое',
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎬'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️'
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝'
    return '📎'
  }

  const handleDownload = (file: any) => {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDelete = async (projectId: string, fileId: string) => {
    if (!confirm('Удалить этот файл?')) return

    try {
      const res = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Ошибка удаления')

      toast.success('Файл удалён')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // Filter files
  const filteredProjects = projects
    .map((project) => ({
      ...project,
      files: project.files.filter((file: any) => {
        const matchesSearch =
          searchQuery === '' ||
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (file.description && file.description.toLowerCase().includes(searchQuery.toLowerCase()))

        const matchesCategory =
          selectedCategory === 'all' || file.category === selectedCategory

        return matchesSearch && matchesCategory
      }),
    }))
    .filter((project) => {
      const matchesProject = selectedProject === 'all' || project.id === selectedProject
      return matchesProject && project.files.length > 0
    })

  const filteredFilesCount = filteredProjects.reduce((acc, p) => acc + p.files.length, 0)

  // Get unique categories from all files
  const allCategories = new Set<string>()
  projects.forEach((p) =>
    p.files.forEach((f: any) => {
      if (f.category) allCategories.add(f.category)
    })
  )

  return (
    <AppLayout user={user} workspace={workspace}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <HardDrive className="h-6 w-6" />
              Хранилище
            </h1>
            <p className="text-muted-foreground mt-1">
              {totalFiles} файлов, {formatFileSize(totalSize)} всего
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Все проекты" />
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
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Все категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {Array.from(allCategories).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat] || cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(searchQuery || selectedProject !== 'all' || selectedCategory !== 'all') && (
            <div className="mt-3 text-sm text-muted-foreground">
              Найдено: {filteredFilesCount} файлов
            </div>
          )}
        </div>

        {/* Files by Project */}
        {filteredProjects.length > 0 ? (
          <div className="space-y-6">
            {filteredProjects.map((project) => (
              <div key={project.id} className="bg-card rounded-lg shadow">
                {/* Project Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-foreground">{project.name}</h2>
                    <Badge variant="secondary">{project.files.length} файлов</Badge>
                  </div>
                  <Link href={`/projects/${project.id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Открыть проект
                    </Button>
                  </Link>
                </div>

                {/* Files List */}
                <div className="divide-y">
                  {project.files.map((file: any) => (
                    <div
                      key={file.id}
                      className="px-6 py-4 flex items-start justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                        <div className="min-w-0">
                          <h3 className="font-medium text-foreground truncate">{file.name}</h3>
                          {file.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {file.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                            {file.category && (
                              <Badge variant="outline" className="text-xs">
                                {categoryLabels[file.category] || file.category}
                              </Badge>
                            )}
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{new Date(file.createdAt).toLocaleDateString('ru-RU')}</span>
                            {file.uploadedBy && (
                              <>
                                <span>•</span>
                                <span>{file.uploadedBy.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-4 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(file)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(project.id, file.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Нет файлов</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedProject !== 'all' || selectedCategory !== 'all'
                ? 'Файлы не найдены по заданным фильтрам'
                : 'Загрузите файлы в проекты, чтобы они появились здесь'}
            </p>
            {!searchQuery && selectedProject === 'all' && selectedCategory === 'all' && (
              <Link href="/projects">
                <Button>Перейти к проектам</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
