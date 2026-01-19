import type { ExtractedPain, SocialPost, PainCategory, PainSeverity } from '@prisma/client'

export type PainRadarMetrics = {
  totalPains: number
  totalPosts: number
  topCategory: PainCategory | null
  avgSentiment: number
}

export type PainWithPost = ExtractedPain & {
  post: SocialPost
}

export type ProjectMatch = {
  id: string
  name: string
  pain: string
  similarity: number
}

export type SentimentDistribution = {
  positive: number
  neutral: number
  negative: number
}

export type PainTrend = {
  date: string
  count: number
  sentiment: number
}

export type TopPain = {
  id: string
  painText: string
  frequency: number
  severity: PainSeverity
  trend: number
  category: PainCategory
}

export type CategoryAggregation = Record<PainCategory, number>
export type SeverityAggregation = Record<PainSeverity, number>
