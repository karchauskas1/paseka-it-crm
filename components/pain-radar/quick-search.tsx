'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Loader2,
  Search,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  Zap,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'

interface ScoredPost {
  id: string
  platform: string
  author: string
  title: string
  content: string
  url: string
  likes: number
  comments: number
  engagement: number
  engagementScore: number
  problemScore: number
  totalScore: number
  createdAt: string
}

interface SearchResult {
  query: string
  posts: ScoredPost[]
  topProblems: ScoredPost[]
  stats: {
    total: number
    afterFilter: number
    byPlatform: Record<string, number>
    avgEngagement: number
    avgProblemScore: number
    errors: Array<{ platform: string; error: string }>
  }
}

interface AIAnalysis {
  summary: string
  categories: {
    name: string
    count: number
    examples: string[]
  }[]
  topInsights: string[]
  recommendations: string[]
}

interface QuickSearchProps {
  workspaceId: string
}

const PLATFORMS = [
  { id: 'HACKERNEWS', name: 'Hacker News', emoji: '🟠' },
  { id: 'HABR', name: 'Habr', emoji: '🔵' },
  { id: 'VCRU', name: 'VC.ru', emoji: '🟢' },
  { id: 'TELEGRAM', name: 'Telegram', emoji: '✈️' },
]

export function QuickSearch({ workspaceId }: QuickSearchProps) {
  const [query, setQuery] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['HACKERNEWS', 'HABR', 'VCRU'])
  const [isSearching, setIsSearching] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Введите поисковый запрос')
      return
    }

    if (selectedPlatforms.length === 0) {
      toast.error('Выберите хотя бы одну платформу')
      return
    }

    setIsSearching(true)
    setResult(null)
    setAnalysis(null)

    try {
      const response = await fetch('/api/pain-radar/quick-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          query: query.trim(),
          platforms: selectedPlatforms,
          limit: 50,
          dedupe: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Search failed')
      }

      const data: SearchResult = await response.json()
      setResult(data)

      if (data.posts.length > 0) {
        toast.success(`Найдено ${data.posts.length} постов`)
      } else {
        toast.info('Постов не найдено')
      }
    } catch (error: any) {
      console.error('Search error:', error)
      toast.error(error.message || 'Ошибка поиска')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAIAnalysis = async () => {
    if (!result || result.posts.length === 0) return

    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/pain-radar/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          posts: result.posts,
          topic: query,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Analysis failed')
      }

      const data = await response.json()
      setAnalysis(data.analysis)
      toast.success('AI анализ завершён')
    } catch (error: any) {
      console.error('AI Analysis error:', error)
      toast.error(error.message || 'Ошибка AI анализа')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'HACKERNEWS': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'HABR': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'VCRU': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'TELEGRAM': return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-gray-500'
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Быстрый поиск проблем
          </CardTitle>
          <CardDescription>
            Найдите посты с проблемами пользователей и проанализируйте их с помощью AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Введите тему для поиска (например: CRM, бухгалтерия, доставка)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Поиск...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Найти
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-4">
            {PLATFORMS.map(platform => (
              <div key={platform.id} className="flex items-center space-x-2">
                <Checkbox
                  id={platform.id}
                  checked={selectedPlatforms.includes(platform.id)}
                  onCheckedChange={() => togglePlatform(platform.id)}
                />
                <Label htmlFor={platform.id} className="cursor-pointer text-sm">
                  {platform.emoji} {platform.name}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Stats */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{result.stats.afterFilter}</div>
                <p className="text-xs text-muted-foreground">Постов найдено</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{result.topProblems.length}</div>
                <p className="text-xs text-muted-foreground">Топ проблем</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{result.stats.avgEngagement}</div>
                <p className="text-xs text-muted-foreground">Avg Engagement</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{result.stats.avgProblemScore}</div>
                <p className="text-xs text-muted-foreground">Avg Problem Score</p>
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis Button & Results */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  AI Анализ
                </CardTitle>
                <Button
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing || result.posts.length === 0}
                  variant={analysis ? 'outline' : 'default'}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Анализ...
                    </>
                  ) : analysis ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Обновить анализ
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Запустить AI анализ
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>

            {analysis && (
              <CardContent className="space-y-6">
                {/* Summary */}
                <div>
                  <h4 className="font-semibold mb-2">Резюме</h4>
                  <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                </div>

                {/* Categories */}
                {analysis.categories.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Категории проблем</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {analysis.categories.map((cat, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{cat.name}</span>
                            <Badge variant="secondary">{cat.count} постов</Badge>
                          </div>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {cat.examples.slice(0, 2).map((ex, j) => (
                              <li key={j} className="truncate">• {ex}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insights */}
                {analysis.topInsights.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Ключевые инсайты
                    </h4>
                    <ul className="space-y-2">
                      {analysis.topInsights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-yellow-500 font-bold">{i + 1}.</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {analysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Рекомендации для бизнеса
                    </h4>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-green-500 font-bold">✓</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            )}

            {!analysis && !isAnalyzing && (
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">
                  Нажмите "Запустить AI анализ" для получения инсайтов и рекомендаций
                </p>
              </CardContent>
            )}
          </Card>

          {/* Top Problems */}
          {result.topProblems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  Топ проблемы
                </CardTitle>
                <CardDescription>
                  Посты с высоким engagement и problem score
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.topProblems.map((post, i) => (
                  <div
                    key={post.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-lg font-bold text-muted-foreground">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getPlatformColor(post.platform)}>
                          {post.platform}
                        </Badge>
                        <span className={`text-sm font-semibold ${getScoreColor(post.totalScore)}`}>
                          Score: {post.totalScore}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2 mb-2">
                        {post.title || post.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {post.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {post.comments}
                        </span>
                        <span>Engagement: {post.engagementScore}</span>
                        <span>Problem: {post.problemScore}</span>
                      </div>
                    </div>
                    <Link href={post.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* All Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Все результаты ({result.posts.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.posts.slice(0, 20).map((post, i) => (
                <div
                  key={post.id}
                  className="flex items-center gap-3 p-2 border rounded hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}</span>
                  <Badge variant="outline" className="text-xs">
                    {post.platform}
                  </Badge>
                  <span className={`text-xs font-medium ${getScoreColor(post.totalScore)}`}>
                    [{post.totalScore}]
                  </span>
                  <p className="text-sm truncate flex-1">
                    {post.title || post.content.slice(0, 100)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" /> {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> {post.comments}
                    </span>
                  </div>
                  <Link href={post.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Link>
                </div>
              ))}
              {result.posts.length > 20 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  Показано 20 из {result.posts.length} результатов
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!result && !isSearching && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Введите поисковый запрос и выберите платформы для поиска проблем
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
