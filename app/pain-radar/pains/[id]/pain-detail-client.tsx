'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SentimentGauge } from '@/components/pain-radar/sentiment-gauge'
import { PainCard } from '@/components/pain-radar/pain-card'
import { useToast } from '@/lib/hooks/use-toast'
import { useRouter } from 'next/navigation'
import {
  ExternalLink,
  Sparkles,
  Link as LinkIcon,
  Loader2,
  Calendar,
  User,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout'
import type { PainCategory, PainSeverity, SocialPlatform, ProjectStatus } from '@prisma/client'

interface PainDetailClientProps {
  pain: {
    id: string
    painText: string
    category: PainCategory
    severity: PainSeverity
    sentiment: number
    confidence: number
    frequency: number
    trend: number
    keywords: string[]
    context: string | null
    aiInsights: any
    createdAt: Date
    post: {
      author: string
      url: string
      platform: SocialPlatform
      content: string
      publishedAt: Date
      keyword: {
        keyword: string
        category: string | null
      }
    }
  }
  linkedProjects: Array<{
    id: string
    name: string
    pain: string | null
    status: ProjectStatus
  }>
  similarPains: Array<{
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
      platform: SocialPlatform
    }
  }>
  workspaceId: string
  user: any
  workspace: any
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

export function PainDetailClient({
  pain,
  linkedProjects,
  similarPains,
  workspaceId,
  user,
  workspace,
}: PainDetailClientProps) {
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [isFindingProjects, setIsFindingProjects] = useState(false)
  const [insights, setInsights] = useState(pain.aiInsights)
  const [matchedProjects, setMatchedProjects] = useState<any[]>([])
  const { toast } = useToast()
  const router = useRouter()

  const generateInsights = async () => {
    setIsGeneratingInsights(true)
    try {
      const response = await fetch(`/api/pain-radar/pains/${pain.id}/insights`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate insights')
      }

      const data = await response.json()
      setInsights(data.insights)

      toast({
        title: 'Успешно',
        description: 'AI рекомендации сгенерированы',
      })
    } catch (error: any) {
      console.error('Generate insights error:', error)
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось сгенерировать рекомендации',
      })
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  const findMatchingProjects = async () => {
    setIsFindingProjects(true)
    try {
      const response = await fetch('/api/pain-radar/match-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          painId: pain.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to find matching projects')
      }

      const data = await response.json()
      setMatchedProjects(data.projects)

      toast({
        title: 'Успешно',
        description: `Найдено ${data.matchesFound} похожих проектов`,
      })
    } catch (error: any) {
      console.error('Match projects error:', error)
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось найти похожие проекты',
      })
    } finally {
      setIsFindingProjects(false)
    }
  }

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/pain-radar" userRole={user.role}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">
                      {categoryLabels[pain.category]}
                    </Badge>
                    <Badge variant="outline" className={severityColors[pain.severity]}>
                      {severityLabels[pain.severity]}
                    </Badge>
                    <Badge variant="secondary">
                      Confidence: {(pain.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">{pain.painText}</CardTitle>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>×{pain.frequency}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SentimentGauge sentiment={pain.sentiment} size="md" />

              {pain.keywords.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Ключевые слова</p>
                  <div className="flex flex-wrap gap-2">
                    {pain.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {pain.context && (
                <div>
                  <p className="text-sm font-medium mb-2">Контекст</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {pain.context}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Исходный пост</CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="capitalize">
                    {pain.post.platform.toLowerCase()}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {pain.post.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(pain.post.publishedAt).toLocaleDateString('ru-RU')}
                  </span>
                  <Link
                    href={pain.post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto"
                  >
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Открыть
                    </Button>
                  </Link>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{pain.post.content}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI Рекомендации</CardTitle>
                {!insights && (
                  <Button
                    onClick={generateInsights}
                    disabled={isGeneratingInsights}
                    size="sm"
                  >
                    {isGeneratingInsights ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Генерация...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Сгенерировать
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {insights ? (
                <div className="space-y-4">
                  {insights.suggestions && (
                    <div>
                      <p className="text-sm font-medium mb-2">Рекомендации</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {insights.suggestions.map((suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {insights.opportunities && (
                    <div>
                      <p className="text-sm font-medium mb-2">Возможности</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {insights.opportunities.map((opp: string, index: number) => (
                          <li key={index}>{opp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {insights.risks && (
                    <div>
                      <p className="text-sm font-medium mb-2">Риски</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {insights.risks.map((risk: string, index: number) => (
                          <li key={index}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Нажмите "Сгенерировать" чтобы получить AI рекомендации
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Похожие проекты</CardTitle>
                <Button
                  onClick={findMatchingProjects}
                  disabled={isFindingProjects}
                  size="sm"
                  variant="outline"
                >
                  {isFindingProjects ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {linkedProjects.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium">Связанные проекты</p>
                  {linkedProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}?workspace=${workspaceId}`}
                    >
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="pt-4">
                          <p className="font-medium text-sm">{project.name}</p>
                          {project.pain && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {project.pain}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {matchedProjects.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">AI совпадения</p>
                  {matchedProjects.map((match: any) => (
                    <Card key={match.projectId}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{match.project.name}</p>
                            {match.project.pain && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {match.project.pain}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {(match.similarity * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {linkedProjects.length === 0 && matchedProjects.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Нет связанных проектов. Используйте AI поиск для поиска похожих проектов.
                </p>
              )}
            </CardContent>
          </Card>

          {similarPains.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Похожие боли</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {similarPains.map((similar) => (
                  <PainCard
                    key={similar.id}
                    pain={similar}
                    onClick={() => router.push(`/pain-radar/pains/${similar.id}?workspace=${workspaceId}`)}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
