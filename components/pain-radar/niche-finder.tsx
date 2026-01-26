'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Loader2,
  Target,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  Zap,
  Sparkles,
  Copy,
  RefreshCw,
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

interface NicheAnalysisResult {
  niche: string
  keywords: string[]
  posts: ScoredPost[]
  analysis: AIAnalysis
  stats: {
    totalFound: number
    afterDedup: number
    returned: number
    avgEngagement: number
    avgProblemScore: number
  }
}

interface NicheFinderProps {
  workspaceId: string
}

const PLATFORMS = [
  { id: 'HACKERNEWS', name: 'Hacker News', emoji: '🟠' },
  { id: 'HABR', name: 'Habr', emoji: '🔵' },
  { id: 'VCRU', name: 'VC.ru', emoji: '🟢' },
  { id: 'LINKEDIN', name: 'LinkedIn', emoji: '💼' },
]

const MESSAGE_TONES = [
  { value: 'empathetic', label: 'Эмпатичный', description: 'Понимающий, поддерживающий тон' },
  { value: 'professional', label: 'Профессиональный', description: 'Деловой, формальный стиль' },
  { value: 'casual', label: 'Дружелюбный', description: 'Неформальный, дружеский тон' },
]

export function NicheFinder({ workspaceId }: NicheFinderProps) {
  const [niche, setNiche] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['HABR', 'VCRU', 'LINKEDIN'])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<NicheAnalysisResult | null>(null)

  // Генерация сообщений
  const [selectedProblem, setSelectedProblem] = useState<string>('')
  const [messageTone, setMessageTone] = useState<string>('empathetic')
  const [solution, setSolution] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMessages, setGeneratedMessages] = useState<string[]>([])

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  const handleAnalyze = async () => {
    if (!niche.trim()) {
      toast.error('Введите нишу для анализа')
      return
    }

    if (selectedPlatforms.length === 0) {
      toast.error('Выберите хотя бы одну платформу')
      return
    }

    setIsAnalyzing(true)
    setResult(null)
    setGeneratedMessages([])

    try {
      toast.info('Генерирую ключевые слова...')

      const response = await fetch('/api/pain-radar/niche-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          niche: niche.trim(),
          platforms: selectedPlatforms,
          limit: 50,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Analysis failed')
      }

      const data: NicheAnalysisResult = await response.json()
      setResult(data)

      toast.success(`Анализ завершён! Найдено ${data.posts.length} постов`)
    } catch (error: any) {
      console.error('Niche analysis error:', error)
      toast.error(error.message || 'Ошибка анализа ниши')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleGenerateMessage = async () => {
    if (!selectedProblem) {
      toast.error('Выберите проблему для генерации сообщения')
      return
    }

    setIsGenerating(true)
    setGeneratedMessages([])

    try {
      const response = await fetch('/api/pain-radar/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: selectedProblem,
          niche: niche,
          solution: solution.trim() || undefined,
          tone: messageTone,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Message generation failed')
      }

      const data = await response.json()
      setGeneratedMessages(data.variants || [data.message])
      toast.success('Сообщения сгенерированы')
    } catch (error: any) {
      console.error('Message generation error:', error)
      toast.error(error.message || 'Ошибка генерации сообщения')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Скопировано в буфер обмена')
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'HACKERNEWS': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'HABR': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'VCRU': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'LINKEDIN': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
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
      {/* Niche Input */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Поиск проблем по нише
          </CardTitle>
          <CardDescription>
            Введите нишу бизнеса, AI найдёт проблемы клиентов и создаст продающие сообщения
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Введите нишу (например: ателье, доставка еды, фитнес-клубы)"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              className="flex-1"
            />
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Анализ...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Найти проблемы
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
                <div className="text-2xl font-bold">{result.stats.returned}</div>
                <p className="text-xs text-muted-foreground">Постов найдено</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{result.keywords.length}</div>
                <p className="text-xs text-muted-foreground">Ключевых слов</p>
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

          {/* Keywords Used */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ключевые слова для поиска</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((keyword, i) => (
                  <Badge key={i} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          {result.analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  AI Анализ проблем
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div>
                  <h4 className="font-semibold mb-2">Резюме</h4>
                  <p className="text-sm text-muted-foreground">{result.analysis.summary}</p>
                </div>

                {/* Categories */}
                {result.analysis.categories.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Категории проблем</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {result.analysis.categories.map((cat, i) => (
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
                {result.analysis.topInsights.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Ключевые инсайты
                    </h4>
                    <ul className="space-y-2">
                      {result.analysis.topInsights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-yellow-500 font-bold">{i + 1}.</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {result.analysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Рекомендации для бизнеса
                    </h4>
                    <ul className="space-y-2">
                      {result.analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-green-500 font-bold">✓</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Message Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Генератор сообщений
              </CardTitle>
              <CardDescription>
                Создайте продающие сообщения на основе найденных проблем
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Выберите проблему</Label>
                <Select value={selectedProblem} onValueChange={setSelectedProblem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию проблемы" />
                  </SelectTrigger>
                  <SelectContent>
                    {result.analysis.categories.map((cat, i) => (
                      <SelectItem key={i} value={cat.name}>
                        {cat.name} ({cat.count} постов)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ваше решение (опционально)</Label>
                <Textarea
                  placeholder="Опишите ваше решение проблемы..."
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Тон сообщения</Label>
                <Select value={messageTone} onValueChange={setMessageTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TONES.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label} - {tone.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerateMessage}
                disabled={isGenerating || !selectedProblem}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Сгенерировать сообщения
                  </>
                )}
              </Button>

              {/* Generated Messages */}
              {generatedMessages.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-semibold text-sm">Сгенерированные варианты</h4>
                  {generatedMessages.map((message, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Вариант {i + 1}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(message)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm">{message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-500" />
                Топ посты с проблемами ({result.posts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.posts.slice(0, 10).map((post, i) => (
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
              {result.posts.length > 10 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  Показано 10 из {result.posts.length} результатов
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!result && !isAnalyzing && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center max-w-md">
              Введите нишу бизнеса, и AI автоматически найдёт проблемы клиентов,
              проанализирует их и создаст продающие сообщения
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
