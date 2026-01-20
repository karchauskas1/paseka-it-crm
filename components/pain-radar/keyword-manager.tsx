'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { ScanTrigger } from './scan-trigger'

interface Keyword {
  id: string
  keyword: string
  category?: string | null
  isActive: boolean
  createdAt: string
  _count?: {
    posts: number
    scans: number
  }
}

interface KeywordManagerProps {
  workspaceId: string
  keywords: Keyword[]
  onUpdate: () => void
}

export function KeywordManager({ workspaceId, keywords, onUpdate }: KeywordManagerProps) {
  const [newKeyword, setNewKeyword] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleAdd = async () => {
    if (!newKeyword.trim()) {
      toast.error('Введите ключевое слово')
      return
    }

    setAdding(true)
    try {
      const response = await fetch('/api/pain-radar/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          keyword: newKeyword,
          category: newCategory || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add keyword')
      }

      toast.success('Ключевое слово добавлено')
      setNewKeyword('')
      setNewCategory('')
      onUpdate()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string, keyword: string) => {
    if (!confirm('Удалить ключевое слово "' + keyword + '"?')) return

    try {
      const response = await fetch('/api/pain-radar/keywords/' + id, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast.success('Удалено')
      onUpdate()
    } catch (error) {
      toast.error('Ошибка удаления')
    }
  }

  const handleEdit = async (id: string) => {
    if (!editValue.trim()) return

    try {
      const response = await fetch('/api/pain-radar/keywords/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: editValue }),
      })

      if (!response.ok) throw new Error('Failed to update')

      toast.success('Обновлено')
      setEditingId(null)
      onUpdate()
    } catch (error) {
      toast.error('Ошибка обновления')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ключевые слова для мониторинга</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Новое ключевое слово"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Input
            placeholder="Категория (опционально)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={handleAdd} disabled={adding}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        </div>

        <div className="space-y-2">
          {keywords.map((kw) => (
            <div
              key={kw.id}
              className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                {editingId === kw.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(kw.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium">{kw.keyword}</span>
                    {kw.category && (
                      <Badge variant="outline">{kw.category}</Badge>
                    )}
                    {kw._count && (
                      <div className="text-sm text-muted-foreground">
                        {kw._count.posts} постов · {kw._count.scans} сканирований
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editingId !== kw.id && (
                  <>
                    <ScanTrigger
                      keywordId={kw.id}
                      workspaceId={workspaceId}
                      keywordText={kw.keyword}
                      onScanComplete={onUpdate}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(kw.id)
                        setEditValue(kw.keyword)
                      }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(kw.id, kw.keyword)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          {keywords.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Нет ключевых слов. Добавьте первое!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
