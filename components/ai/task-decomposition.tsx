'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { Sparkles, Loader2, Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskDecompositionProps {
  taskId?: string
  taskTitle: string
  taskDescription?: string
  projectContext?: string
  onSubtasksCreated?: (subtasks: any[]) => void
  className?: string
}

export function TaskDecomposition({
  taskId,
  taskTitle,
  taskDescription,
  projectContext,
  onSubtasksCreated,
  className,
}: TaskDecompositionProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<number>>(new Set())

  const handleDecompose = async () => {
    setLoading(true)
    setSubtasks([])
    setSelectedSubtasks(new Set())

    try {
      const res = await fetch('/api/ai/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: null, // Don't create automatically
          taskTitle,
          taskDescription,
          projectContext,
        }),
      })

      if (!res.ok) {
        throw new Error('Ошибка декомпозиции')
      }

      const data = await res.json()
      setSubtasks(data.subtasks || [])
      // Select all by default
      setSelectedSubtasks(new Set(data.subtasks.map((_: any, i: number) => i)))
    } catch (error) {
      toast({ title: 'Ошибка AI декомпозиции', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSubtask = (index: number) => {
    setSelectedSubtasks((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleCreateSelected = async () => {
    if (!taskId || selectedSubtasks.size === 0) return

    setLoading(true)
    try {
      const selectedTitles = subtasks.filter((_, i) => selectedSubtasks.has(i))

      const createdSubtasks = await Promise.all(
        selectedTitles.map((title) =>
          fetch(`/api/tasks/${taskId}/subtasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
          }).then((res) => res.json())
        )
      )

      toast({ title: `Создано ${createdSubtasks.length} подзадач`, variant: 'success' })
      onSubtasksCreated?.(createdSubtasks)
      setSubtasks([])
      setSelectedSubtasks(new Set())
    } catch (error) {
      toast({ title: 'Ошибка создания подзадач', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {subtasks.length === 0 ? (
        <Button
          onClick={handleDecompose}
          disabled={loading || !taskTitle}
          variant="outline"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Анализирую задачу...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Декомпозировать с AI
            </>
          )}
        </Button>
      ) : (
        <>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                AI предлагает подзадачи
              </span>
            </div>
            <div className="space-y-2">
              {subtasks.map((subtask, index) => (
                <label
                  key={index}
                  className="flex items-start gap-3 p-2 rounded hover:bg-purple-100 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSubtasks.has(index)}
                    onChange={() => handleToggleSubtask(index)}
                    className="mt-0.5 h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span
                    className={cn(
                      'text-sm',
                      selectedSubtasks.has(index) ? 'text-purple-900' : 'text-purple-600'
                    )}
                  >
                    {subtask}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {taskId && (
              <Button
                onClick={handleCreateSelected}
                disabled={loading || selectedSubtasks.size === 0}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Создать выбранные ({selectedSubtasks.size})
              </Button>
            )}
            <Button
              onClick={handleDecompose}
              disabled={loading}
              variant="outline"
            >
              Перегенерировать
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
