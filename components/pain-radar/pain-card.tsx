'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SentimentGauge } from './sentiment-gauge'
import { ArrowUp, ArrowDown, Minus, ExternalLink } from 'lucide-react'
import type { PainCategory, PainSeverity } from '@prisma/client'
import Link from 'next/link'

interface PainCardProps {
  pain: {
    id: string
    painText: string
    category: PainCategory
    severity: PainSeverity
    sentiment: number
    frequency: number
    trend: number
    keywords: string[]
    post?: {
      author: string
      url: string
      platform: string
    }
  }
  onClick?: () => void
}

const categoryLabels: Record<PainCategory, string> = {
  TIME_MANAGEMENT: 'Управление временем',
  COST: 'Стоимость',
  TECHNICAL: 'Технические',
  PROCESS: 'Процессы',
  COMMUNICATION: 'Коммуникация',
  QUALITY: 'Качество',
  SCALABILITY: 'Масштабируемость',
  SECURITY: 'Безопасность',
  OTHER: 'Другое',
}

const severityColors: Record<PainSeverity, string> = {
  LOW: 'bg-blue-100 text-blue-800 border-blue-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
}

const severityLabels: Record<PainSeverity, string> = {
  LOW: 'Низкая',
  MEDIUM: 'Средняя',
  HIGH: 'Высокая',
  CRITICAL: 'Критическая',
}

export function PainCard({ pain, onClick }: PainCardProps) {
  const getTrendIcon = () => {
    if (pain.trend > 0.1) return <ArrowUp className="h-3 w-3 text-red-500" />
    if (pain.trend < -0.1) return <ArrowDown className="h-3 w-3 text-green-500" />
    return <Minus className="h-3 w-3 text-muted-foreground" />
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {categoryLabels[pain.category]}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${severityColors[pain.severity]}`}
              >
                {severityLabels[pain.severity]}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>×{pain.frequency}</span>
            {getTrendIcon()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed line-clamp-3">{pain.painText}</p>

        <SentimentGauge sentiment={pain.sentiment} size="sm" />

        {pain.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pain.keywords.slice(0, 5).map((keyword, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
              >
                {keyword}
              </span>
            ))}
            {pain.keywords.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{pain.keywords.length - 5}
              </span>
            )}
          </div>
        )}

        {pain.post && (
          <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
            <span className="capitalize">{pain.post.platform.toLowerCase()}</span>
            <span>·</span>
            <span>{pain.post.author}</span>
            <Link
              href={pain.post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
