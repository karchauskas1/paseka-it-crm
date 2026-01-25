'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KeywordManager } from '@/components/pain-radar/keyword-manager'
import { PainCard } from '@/components/pain-radar/pain-card'
import { PainFilters } from '@/components/pain-radar/pain-filters'
import { PostSelector } from '@/components/pain-radar/post-selector'
import { QuickSearch } from '@/components/pain-radar/quick-search'
import { useRouter } from 'next/navigation'
import { Loader2, Search, FileText, TrendingUp, MessageSquare } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import type { PainCategory, PainSeverity, SocialPlatform } from '@prisma/client'

interface Keyword {
  id: string
  keyword: string
  category: string | null
  isActive: boolean
  createdAt: string
  _count: {
    posts: number
    scans: number
  }
}

interface Pain {
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
}

interface PainRadarClientProps {
  workspaceId: string
  initialKeywords: Keyword[]
  initialPains: Pain[]
  user: any
  workspace: any
}

export function PainRadarClient({
  workspaceId,
  initialKeywords,
  initialPains,
  user,
  workspace,
}: PainRadarClientProps) {
  const router = useRouter()
  const [keywords, setKeywords] = useState(initialKeywords)
  const [pains, setPains] = useState(initialPains)
  const [posts, setPosts] = useState<any[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [isLoadingPains, setIsLoadingPains] = useState(false)
  const [filters, setFilters] = useState<{
    category?: PainCategory
    severity?: PainSeverity
    sortBy?: string
    search?: string
  }>({})

  const refreshKeywords = async () => {
    try {
      const response = await fetch(`/api/pain-radar/keywords?workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setKeywords(data.keywords)
      }
    } catch (error) {
      console.error('Failed to refresh keywords:', error)
    }
  }

  const refreshPains = async () => {
    setIsLoadingPains(true)
    try {
      const params = new URLSearchParams({
        workspaceId,
        limit: '50',
        offset: '0',
        ...filters,
      })

      const response = await fetch(`/api/pain-radar/pains?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPains(data.pains)
      }
    } catch (error) {
      console.error('Failed to refresh pains:', error)
    } finally {
      setIsLoadingPains(false)
    }
  }

  const loadPosts = async () => {
    setIsLoadingPosts(true)
    try {
      const params = new URLSearchParams({
        workspaceId,
        limit: '100',
        offset: '0',
      })

      const response = await fetch(`/api/pain-radar/posts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts)
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setIsLoadingPosts(false)
    }
  }

  useEffect(() => {
    refreshPains()
  }, [filters])

  // Статистика
  const totalPosts = keywords.reduce((sum, k) => sum + k._count.posts, 0)
  const activeKeywords = keywords.filter(k => k.isActive).length

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/pain-radar" userRole={user.role}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">Pain Radar</h1>
          <p className="text-sm text-muted-foreground">
            Поиск и анализ проблем пользователей
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:flex">
            <FileText className="h-3 w-3 mr-1" />
            {activeKeywords} слов
          </Badge>
          <Badge variant="outline" className="hidden sm:flex">
            <MessageSquare className="h-3 w-3 mr-1" />
            {totalPosts} постов
          </Badge>
          <Badge variant="outline" className="hidden sm:flex">
            <TrendingUp className="h-3 w-3 mr-1" />
            {pains.length} болей
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="keywords" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          {/* 1. Ключевые слова - первый шаг */}
          <TabsTrigger value="keywords" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Ключевые слова</span>
          </TabsTrigger>

          {/* 2. Поиск - основной функционал */}
          <TabsTrigger value="search" className="text-xs sm:text-sm">
            <Search className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Поиск</span>
          </TabsTrigger>

          {/* 3. Посты - для анализа сохранённых */}
          <TabsTrigger value="posts" onClick={loadPosts} className="text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Посты</span>
            {totalPosts > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {totalPosts}
              </Badge>
            )}
          </TabsTrigger>

          {/* 4. Результаты - найденные боли */}
          <TabsTrigger value="results" className="text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Результаты</span>
            {pains.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {pains.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Ключевые слова */}
        <TabsContent value="keywords" className="space-y-6">
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Как это работает?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>1.</strong> Добавьте ключевые слова для мониторинга (например: "CRM проблемы", "бухгалтерия")</p>
              <p><strong>2.</strong> Нажмите "Сканировать" чтобы найти посты по ключевому слову</p>
              <p><strong>3.</strong> Перейдите в "Посты" и проанализируйте найденные публикации</p>
              <p><strong>4.</strong> Смотрите результаты во вкладке "Результаты"</p>
            </CardContent>
          </Card>

          <KeywordManager
            keywords={keywords}
            workspaceId={workspaceId}
            onUpdate={refreshKeywords}
          />
        </TabsContent>

        {/* Быстрый поиск */}
        <TabsContent value="search" className="space-y-6">
          <QuickSearch workspaceId={workspaceId} />
        </TabsContent>

        {/* Посты из БД */}
        <TabsContent value="posts" className="space-y-6">
          {isLoadingPosts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length > 0 ? (
            <PostSelector
              posts={posts}
              workspaceId={workspaceId}
              onAnalyzeComplete={refreshPains}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-2">
                  Нет сохранённых постов
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Добавьте ключевые слова и запустите сканирование
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Результаты (боли) */}
        <TabsContent value="results" className="space-y-4 sm:space-y-6">
          <PainFilters onFilterChange={setFilters} />

          {isLoadingPains ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pains.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pains.map((pain) => (
                <PainCard
                  key={pain.id}
                  pain={pain}
                  onClick={() => router.push(`/pain-radar/pains/${pain.id}?workspace=${workspaceId}`)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-2">
                  Боли ещё не найдены
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Используйте "Поиск" для быстрого анализа или проанализируйте посты из вкладки "Посты"
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  )
}
