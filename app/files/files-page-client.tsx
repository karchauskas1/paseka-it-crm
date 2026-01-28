'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  HardDrive,
  Search,
  Download,
  Trash2,
  ExternalLink,
  FolderOpen,
  FileText,
  Upload,
  Loader2,
  Pencil,
  X,
  Check,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'

interface FilesPageClientProps {
  projects: any[]
  workspaceFiles: any[]
  user: any
  workspace: any
  totalFiles: number
  totalSize: number
}

export default function FilesPageClient({
  projects: initialProjects,
  workspaceFiles: initialWorkspaceFiles,
  user,
  workspace,
  totalFiles,
  totalSize,
}: FilesPageClientProps) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [workspaceFiles, setWorkspaceFiles] = useState(initialWorkspaceFiles)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', category: '' })
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadForm, setUploadForm] = useState({ description: '', category: '' })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Delete project file
  const handleDeleteProjectFile = async (projectId: string, fileId: string) => {
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

  // Delete workspace file
  const handleDeleteWorkspaceFile = async (fileId: string) => {
    if (!confirm('Удалить этот файл?')) return

    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Ошибка удаления')

      toast.success('Файл удалён')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // Upload files to workspace
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    try {
      for (const file of selectedFiles) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`Файл ${file.name} слишком большой. Максимальный размер: 50MB`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        if (uploadForm.description) formData.append('description', uploadForm.description)
        if (uploadForm.category) formData.append('category', uploadForm.category)

        const res = await fetch('/api/files', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Ошибка загрузки')
        }
      }

      toast.success(selectedFiles.length > 1 ? 'Файлы загружены' : 'Файл загружен')
      setUploadDialogOpen(false)
      setSelectedFiles([])
      setUploadForm({ description: '', category: '' })
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    setSelectedFiles(Array.from(files))
    setUploadDialogOpen(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  // Edit workspace file
  const startEditing = (file: any) => {
    setEditingFile(file.id)
    setEditForm({
      name: file.name,
      description: file.description || '',
      category: file.category || '',
    })
  }

  const cancelEditing = () => {
    setEditingFile(null)
    setEditForm({ name: '', description: '', category: '' })
  }

  const saveEdit = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || null,
          category: editForm.category || null,
        }),
      })

      if (!res.ok) throw new Error('Ошибка сохранения')

      toast.success('Файл обновлён')
      setEditingFile(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // Filter workspace files
  const filteredWorkspaceFiles = workspaceFiles.filter((file: any) => {
    const matchesSearch =
      searchQuery === '' ||
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.description && file.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory
    const matchesProject = selectedProject === 'all' || selectedProject === 'workspace'

    return matchesSearch && matchesCategory && matchesProject
  })

  // Filter project files
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

  const showWorkspaceFiles = selectedProject === 'all' || selectedProject === 'workspace'
  const filteredFilesCount =
    (showWorkspaceFiles ? filteredWorkspaceFiles.length : 0) +
    filteredProjects.reduce((acc, p) => acc + p.files.length, 0)

  // Get unique categories from all files
  const allCategories = new Set<string>()
  workspaceFiles.forEach((f: any) => {
    if (f.category) allCategories.add(f.category)
  })
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
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Загрузить файлы
            </Button>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <FolderOpen className={`h-12 w-12 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-muted-foreground">
            {isDragging ? 'Отпустите файлы для загрузки' : 'Перетащите файлы сюда или нажмите кнопку выше'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Максимальный размер файла: 50MB</p>
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
                <SelectValue placeholder="Все файлы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все файлы</SelectItem>
                <SelectItem value="workspace">Общие файлы</SelectItem>
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

        {/* Workspace Files (General Storage) */}
        {showWorkspaceFiles && filteredWorkspaceFiles.length > 0 && (
          <div className="bg-card rounded-lg shadow">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Общие файлы</h2>
                <Badge variant="secondary">{filteredWorkspaceFiles.length} файлов</Badge>
              </div>
            </div>

            <div className="divide-y">
              {filteredWorkspaceFiles.map((file: any) => (
                <div
                  key={file.id}
                  className="px-6 py-4 hover:bg-muted/50 transition-colors"
                >
                  {editingFile === file.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Название</Label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Описание</Label>
                        <Textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Для чего нужен этот файл..."
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Категория</Label>
                        <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Выберите категорию" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={cancelEditing}>
                          <X className="h-4 w-4 mr-1" />
                          Отмена
                        </Button>
                        <Button size="sm" onClick={() => saveEdit(file.id)}>
                          <Check className="h-4 w-4 mr-1" />
                          Сохранить
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
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
                        <Button variant="ghost" size="sm" onClick={() => startEditing(file)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(file)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWorkspaceFile(file.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Files */}
        {filteredProjects.length > 0 && (
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
                          onClick={() => handleDeleteProjectFile(project.id, file.id)}
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
        )}

        {/* Empty State */}
        {filteredFilesCount === 0 && (
          <div className="bg-card rounded-lg shadow p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Нет файлов</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedProject !== 'all' || selectedCategory !== 'all'
                ? 'Файлы не найдены по заданным фильтрам'
                : 'Загрузите файлы в хранилище или проекты'}
            </p>
            {!searchQuery && selectedProject === 'all' && selectedCategory === 'all' && (
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Загрузить первый файл
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Загрузить файлы</DialogTitle>
            <DialogDescription>
              {selectedFiles.length} {selectedFiles.length === 1 ? 'файл' : 'файлов'} выбрано
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span>{getFileIcon(file.type)}</span>
                  <span className="truncate">{file.name}</span>
                  <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                </div>
              ))}
            </div>

            <div>
              <Label>Описание (опционально)</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Для чего нужны эти файлы..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Категория (опционально)</Label>
              <Select value={uploadForm.category} onValueChange={(v) => setUploadForm({ ...uploadForm, category: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setUploadDialogOpen(false)
              setSelectedFiles([])
            }}>
              Отмена
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Загрузить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
