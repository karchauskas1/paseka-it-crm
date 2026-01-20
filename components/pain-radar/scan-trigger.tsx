'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2, Radar } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

interface ScanTriggerProps {
  keywordId: string
  keyword: string
  workspaceId: string
  onScanComplete?: () => void
}

export function ScanTrigger({
  keywordId,
  keyword,
  workspaceId,
  onScanComplete,
}: ScanTriggerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [platform, setPlatform] = useState<'REDDIT' | 'WEB'>('WEB')
  const { toast } = useToast()

  const handleScan = async (selectedPlatform?: 'REDDIT' | 'WEB') => {
    const platformToUse = selectedPlatform || platform
    setIsScanning(true)

    try {
      // Start scan
      const response = await fetch('/api/pain-radar/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          keywordId,
          limit: 50,
          platform: platformToUse,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Scan failed')
      }

      const { scanId } = await response.json()

      // Poll for scan completion
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/pain-radar/scan/${scanId}`)
          if (!statusResponse.ok) {
            clearInterval(pollInterval)
            setIsScanning(false)
            return
          }

          const { scan, posts } = await statusResponse.json()

          if (scan.status === 'COMPLETED') {
            clearInterval(pollInterval)
            setIsScanning(false)

            toast({
              title: 'Сканирование завершено',
              description: `Найдено ${scan.postsFound} постов (${scan.postsNew} новых)`,
            })

            onScanComplete?.()
          } else if (scan.status === 'FAILED') {
            clearInterval(pollInterval)
            setIsScanning(false)

            toast({
              variant: 'destructive',
              title: 'Ошибка сканирования',
              description: scan.errorMessage || 'Неизвестная ошибка',
            })
          }
        } catch (error) {
          console.error('Poll error:', error)
        }
      }, 2000) // Poll every 2 seconds

      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(pollInterval)
        if (isScanning) {
          setIsScanning(false)
          toast({
            variant: 'destructive',
            title: 'Таймаут',
            description: 'Сканирование заняло слишком много времени',
          })
        }
      }, 60000)
    } catch (error: any) {
      console.error('Scan error:', error)
      setIsScanning(false)
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message || 'Не удалось запустить сканирование',
      })
    }
  }

  return (
    <div className="flex gap-1">
      <Button
        onClick={() => handleScan()}
        disabled={isScanning}
        size="sm"
        variant="outline"
        className="flex-1"
      >
        {isScanning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Сканирование...
          </>
        ) : (
          <>
            <Radar className="mr-2 h-4 w-4" />
            Сканировать ({platform === 'WEB' ? 'Web' : 'Reddit'})
          </>
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={isScanning}
            className="px-2"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setPlatform('WEB')}>
            🌐 Web Search {platform === 'WEB' && '✓'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPlatform('REDDIT')}>
            🔴 Reddit {platform === 'REDDIT' && '✓'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
