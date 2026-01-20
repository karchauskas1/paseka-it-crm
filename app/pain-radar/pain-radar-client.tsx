'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KeywordManager } from '@/components/pain-radar/keyword-manager'
import { PainCard } from '@/components/pain-radar/pain-card'
import { PainFilters } from '@/components/pain-radar/pain-filters'
import { PostSelector } from '@/components/pain-radar/post-selector'
import { useRouter } from 'next/navigation'
import { Loader2, TrendingUp, FileText, MessageSquare, BarChart3 } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import type { PainCategory, PainSeverity, SocialPlatform } from '@prisma/client'

interface Keyword {
  id: string
  keyword: string
  category: string | null
  isActive: boolean
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

  const refreshKeywords = () => {
    router.refresh()
  }

  const refreshPains = async () => {
    setIsLoadingPains(true)
    try {
      const params = new URLSearchParams({
        workspaceId,
        limit: '20',
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
        limit: '50',
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

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/pain-radar" userRole={user.role}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pain Radar</h1>
          <p className="text-muted-foreground">
            Анализ болей бизнеса через мониторинг социальных сетей
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="pains">
            <TrendingUp className="mr-2 h-4 w-4" />
            Боли
          </TabsTrigger>
          <TabsTrigger value="posts" onClick={loadPosts}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Посты
          </TabsTrigger>
          <TabsTrigger value="keywords">
            <FileText className="mr-2 h-4 w-4" />
            Ключевые слова
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего болей</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pains.length}</div>
                <p className="text-xs text-muted-foreground">
                  Извлечено из постов
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ключевых слов</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {keywords.filter(k => k.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Активных из {keywords.length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего постов</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {keywords.reduce((sum, k) => sum + k._count.posts, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Собрано из социальных сетей
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Средний sentiment</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pains.length > 0
                    ? (pains.reduce((sum, p) => sum + p.sentiment, 0) / pains.length).toFixed(2)
                    : '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  От -1.0 до 1.0
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Недавние боли</CardTitle>
              <CardDescription>
                Последние извлеченные боли из социальных сетей
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {pains.slice(0, 10).map((pain) => (
                  <PainCard
                    key={pain.id}
                    pain={pain}
                    onClick={() => router.push(`/pain-radar/pains/${pain.id}?workspace=${workspaceId}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pains" className="space-y-6">
          <PainFilters onFilterChange={setFilters} />

          {isLoadingPains ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pains.map((pain) => (
                <PainCard
                  key={pain.id}
                  pain={pain}
                  onClick={() => router.push(`/pain-radar/pains/${pain.id}?workspace=${workspaceId}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts" className="space-y-6">
          {isLoadingPosts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PostSelector
              posts={posts}
              workspaceId={workspaceId}
              onAnalyzeComplete={refreshPains}
            />
          )}
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <KeywordManager
            keywords={keywords}
            workspaceId={workspaceId}
            onUpdate={refreshKeywords}
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
  )
}
