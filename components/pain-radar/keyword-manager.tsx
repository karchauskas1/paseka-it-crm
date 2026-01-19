'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/lib/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react'
import { ScanTrigger } from './scan-trigger'

interface Keyword {
  id: string
  keyword: string
  category: string | null
  isActive: boolean
  _count: {
    posts: number
    scans: number
  }
}

interface KeywordManagerProps {
  keywords: Keyword[]
  workspaceId: string
  onUpdate: () => void
}

export function KeywordManager({ keywords, workspaceId, onUpdate }: KeywordManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleAdd = async () => {
    if (!newKeyword.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Введите ключевое слово',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/pain-radar/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          keyword: newKeyword.trim(),
          category: newCategory.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add keyword')
      }

      toast({
        title: 'Успешно',
        description: 'Ключевое слово добавлено',
      })

      setNewKeyword('')
      setNewCategory('')
      setIsAddDialogOpen(false)
      onUpdate()
    } catch (error: any) {
      console.error('Add keyword error:', error)
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message || 'Не удалось добавить ключевое слово',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (keywordId: string) => {
    if (!confirm('Вы уверены? Все связанные данные будут удалены.')) {
      return
    }

    try {
      const response = await fetch(`/api/pain-radar/keywords/${keywordId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete keyword')
      }

      toast({
        title: 'Успешно',
        description: 'Ключевое слово удалено',
      })

      onUpdate()
    } catch (error: any) {
      console.error('Delete keyword error:', error)
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить ключевое слово',
      })
    }
  }

  const toggleActive = async (keywordId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/pain-radar/keywords/${keywordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update keyword')
      }

      onUpdate()
    } catch (error: any) {
      console.error('Toggle active error:', error)
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить ключевое слово',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Ключевые слова</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить ключевое слово</DialogTitle>
              <DialogDescription>
                Добавьте новое ключевое слово для мониторинга болей
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyword">Ключевое слово</Label>
                <Input
                  id="keyword"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="project management"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Категория (опционально)</Label>
                <Input
                  id="category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Управление проектами"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button onClick={handleAdd} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Добавление...
                  </>
                ) : (
                  'Добавить'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ключевое слово</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead className="text-center">Постов</TableHead>
              <TableHead className="text-center">Сканов</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keywords.map((kw) => (
              <TableRow key={kw.id}>
                <TableCell className="font-medium">{kw.keyword}</TableCell>
                <TableCell>
                  {kw.category ? (
                    <Badge variant="outline">{kw.category}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">{kw._count.posts}</TableCell>
                <TableCell className="text-center">{kw._count.scans}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(kw.id, kw.isActive)}
                  >
                    {kw.isActive ? (
                      <Badge variant="default">Активно</Badge>
                    ) : (
                      <Badge variant="secondary">Неактивно</Badge>
                    )}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <ScanTrigger
                      keywordId={kw.id}
                      keyword={kw.keyword}
                      workspaceId={workspaceId}
                      onScanComplete={onUpdate}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(kw.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
