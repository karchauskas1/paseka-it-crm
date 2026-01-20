'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Radio } from 'lucide-react'
import { toast } from 'sonner'

interface ScanTriggerProps {
  keywordId: string
  workspaceId: string
  keywordText: string
  onScanComplete?: () => void
}

export function ScanTrigger({
  keywordId,
  workspaceId,
  keywordText,
  onScanComplete,
}: ScanTriggerProps) {
  const [scanning, setScanning] = useState(false)

  const handleScan = async () => {
    setScanning(true)
    try {
      const response = await fetch('/api/pain-radar/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          keywordId,
          platforms: ['HACKERNEWS', 'HABR', 'VCRU', 'TELEGRAM'],
          limit: 50,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Scan failed')
      }

      toast.success(
        'Сканирование завершено: ' + data.postsFound + ' постов найдено (' + data.postsNew + ' новых)'
      )

      if (onScanComplete) {
        onScanComplete()
      }
    } catch (error: any) {
      console.error('Scan error:', error)
      toast.error(error.message || 'Ошибка сканирования')
    } finally {
      setScanning(false)
    }
  }

  return (
    <Button
      onClick={handleScan}
      disabled={scanning}
      size="sm"
      variant="outline"
    >
      {scanning ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Сканирование...
        </>
      ) : (
        <>
          <Radio className="h-4 w-4 mr-2" />
          Сканировать
        </>
      )}
    </Button>
  )
}
