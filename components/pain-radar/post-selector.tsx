'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2, Sparkles, ExternalLink, MessageSquare, ThumbsUp } from 'lucide-react'
import Link from 'next/link'
import type { SocialPlatform } from '@prisma/client'

interface Post {
  id: string
  content: string
  author: string
  url: string
  platform: SocialPlatform
  likes: number
  comments: number
  engagement: number
  publishedAt: Date
  isAnalyzed: boolean
}

interface PostSelectorProps {
  posts: Post[]
  workspaceId: string
  onAnalyzeComplete?: () => void
}

export function PostSelector({ posts, workspaceId, onAnalyzeComplete }: PostSelectorProps) {
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { toast } = useToast()

  const togglePost = (postId: string) => {
    const newSelected = new Set(selectedPosts)
    if (newSelected.has(postId)) {
      newSelected.delete(postId)
    } else {
      newSelected.add(postId)
    }
    setSelectedPosts(newSelected)
  }

  const toggleAll = () => {
    if (selectedPosts.size === posts.filter(p => !p.isAnalyzed).length) {
      setSelectedPosts(new Set())
    } else {
      setSelectedPosts(new Set(posts.filter(p => !p.isAnalyzed).map(p => p.id)))
    }
  }

  const handleAnalyze = async () => {
    if (selectedPosts.size === 0) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Выберите хотя бы один пост для анализа',
      })
      return
    }

    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/pain-radar/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          postIds: Array.from(selectedPosts),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Analysis failed')
      }

      const { analyzed, painsExtracted } = await response.json()

      toast({
        title: 'Анализ завершен',
        description: `Проанализировано ${analyzed} постов. Извлечено ${painsExtracted} болей.`,
      })

      setSelectedPosts(new Set())
      onAnalyzeComplete?.()
    } catch (error: any) {
      console.error('Analyze error:', error)
      toast({
        variant: 'destructive',
        title: 'Ошибка анализа',
        description: error.message || 'Не удалось проанализировать посты',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const unanalyzedPosts = posts.filter(p => !p.isAnalyzed)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Checkbox
            id="select-all"
            checked={selectedPosts.size === unanalyzedPosts.length && unanalyzedPosts.length > 0}
            onCheckedChange={toggleAll}
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            Выбрать все ({unanalyzedPosts.length})
          </label>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing || selectedPosts.size === 0}
          size="sm"
          className="sm:size-default w-full sm:w-auto"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Анализ...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              <span className="sm:hidden">Анализ ({selectedPosts.size})</span>
              <span className="hidden sm:inline">Анализировать выбранные ({selectedPosts.size})</span>
            </>
          )}
        </Button>
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <Card
            key={post.id}
            className={post.isAnalyzed ? 'opacity-50' : ''}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                {!post.isAnalyzed && (
                  <Checkbox
                    checked={selectedPosts.has(post.id)}
                    onCheckedChange={() => togglePost(post.id)}
                  />
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs capitalize">
                      {post.platform.toLowerCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {post.author}
                    </span>
                    {post.isAnalyzed && (
                      <Badge variant="secondary" className="text-xs">
                        Проанализирован
                      </Badge>
                    )}
                    <Link
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Link>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed line-clamp-4">{post.content}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  <span>{post.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{post.comments}</span>
                </div>
                <div className="ml-auto">
                  Engagement: {post.engagement.toFixed(0)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
