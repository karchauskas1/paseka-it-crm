'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/lib/hooks/use-toast'
import { Play, Pause, Clock } from 'lucide-react'

interface TimeEntry {
  id: string
  startedAt: string
  endedAt: string | null
  duration: number | null
  notes: string | null
  user: {
    id: string
    name: string
  }
}

interface TimeTrackerProps {
  taskId: string
  onUpdate?: () => void
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function TimeTracker({ taskId, onUpdate }: TimeTrackerProps) {
  const { toast } = useToast()
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const [currentDuration, setCurrentDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchTimeEntries()
  }, [taskId])

  useEffect(() => {
    if (!isTracking) return

    const interval = setInterval(() => {
      setCurrentDuration((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isTracking])

  const fetchTimeEntries = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-entries`)
      if (!res.ok) throw new Error('Failed to fetch time entries')

      const data = await res.json()
      setTimeEntries(data.timeEntries)

      const activeEntry = data.timeEntries.find((entry: TimeEntry) => !entry.endedAt)
      if (activeEntry) {
        setIsTracking(true)
        const elapsed = Math.floor(
          (new Date().getTime() - new Date(activeEntry.startedAt).getTime()) / 1000
        )
        setCurrentDuration(elapsed)
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleStartStop = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isTracking ? 'stop' : 'start',
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to toggle timer')
      }

      if (isTracking) {
        setIsTracking(false)
        setCurrentDuration(0)
        toast({
          title: 'Трекинг остановлен',
          variant: 'success',
        })
      } else {
        setIsTracking(true)
        setCurrentDuration(0)
        toast({
          title: 'Трекинг запущен',
          variant: 'success',
        })
      }

      await fetchTimeEntries()
      onUpdate?.()
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

  const totalTime = timeEntries.reduce(
    (sum, entry) => sum + (entry.duration || 0),
    0
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant={isTracking ? 'destructive' : 'default'}
            onClick={handleStartStop}
            disabled={isLoading}
          >
            {isTracking ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Остановить
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Запустить
              </>
            )}
          </Button>
          {isTracking && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="font-mono text-lg font-semibold text-green-600">
                {formatDuration(currentDuration)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Всего:</span>
          <Badge variant="outline" className="font-mono">
            {formatDuration(totalTime + (isTracking ? currentDuration : 0))}
          </Badge>
        </div>
      </div>

      {timeEntries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">История</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{entry.user.name}</span>
                  {entry.duration && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      {formatDuration(entry.duration)}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.startedAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
