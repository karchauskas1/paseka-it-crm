'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { PainCategory, PainSeverity } from '@prisma/client'

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
      url: string
      author: string
      platform: string
    }
  }
  onClick?: () => void
}

const categoryColors: Record<PainCategory, string> = {
  TIME_MANAGEMENT: 'bg-blue-100 text-blue-800',
  COST: 'bg-green-100 text-green-800',
  TECHNICAL: 'bg-purple-100 text-purple-800',
  PROCESS: 'bg-orange-100 text-orange-800',
  COMMUNICATION: 'bg-pink-100 text-pink-800',
  QUALITY: 'bg-red-100 text-red-800',
  SCALABILITY: 'bg-indigo-100 text-indigo-800',
  SECURITY: 'bg-yellow-100 text-yellow-800',
  OTHER: 'bg-gray-100 text-gray-800',
}

const severityColors: Record<PainSeverity, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

const categoryLabels: Record<PainCategory, string> = {
  TIME_MANAGEMENT: 'Время',
  COST: 'Стоимость',
  TECHNICAL: 'Техническая',
  PROCESS: 'Процессы',
  COMMUNICATION: 'Коммуникация',
  QUALITY: 'Качество',
  SCALABILITY: 'Масштабирование',
  SECURITY: 'Безопасность',
  OTHER: 'Другое',
}

const severityLabels: Record<PainSeverity, string> = {
  LOW: 'Низкая',
  MEDIUM: 'Средняя',
  HIGH: 'Высокая',
  CRITICAL: 'Критическая',
}

function SentimentGauge({ sentiment }: { sentiment: number }) {
  const getColor = () => {
    if (sentiment >= 0.3) return 'text-green-600'
    if (sentiment <= -0.3) return 'text-red-600'
    return 'text-yellow-600'
  }

  const getLabel = () => {
    if (sentiment >= 0.3) return 'Позитивный'
    if (sentiment <= -0.3) return 'Негативный'
    return 'Нейтральный'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={'h-full ' + getColor().replace('text-', 'bg-')}
          style={{ width: Math.abs(sentiment) * 100 + '%' }}
        />
      </div>
      <span className={'text-xs ' + getColor()}>{getLabel()}</span>
    </div>
  )
}

export function PainCard({ pain, onClick }: PainCardProps) {
  const trendIcon =
    pain.trend > 0.1 ? (
      <TrendingUp className="h-4 w-4 text-red-500" />
    ) : pain.trend < -0.1 ? (
      <TrendingDown className="h-4 w-4 text-green-500" />
    ) : (
      <Minus className="h-4 w-4 text-gray-400" />
    )

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-sm leading-tight">{pain.painText}</p>
          </div>
          <div className="flex items-center gap-1">
            <Badge className={severityColors[pain.severity]}>
              {severityLabels[pain.severity]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={categoryColors[pain.category]}>
            {categoryLabels[pain.category]}
          </Badge>
          {pain.keywords.slice(0, 3).map((keyword, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {keyword}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span>Частота:</span>
              <span className="font-medium">{pain.frequency}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Тренд:</span>
              {trendIcon}
            </div>
          </div>
          {pain.post && (
            <a
              href={pain.post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              <span>{pain.post.platform}</span>
            </a>
          )}
        </div>

        <SentimentGauge sentiment={pain.sentiment} />
      </CardContent>
    </Card>
  )
}
