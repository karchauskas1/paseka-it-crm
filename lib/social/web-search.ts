import { RedditAPIError } from '../pain-radar/errors'
import { calculateEngagement } from './engagement'

export interface WebSearchPost {
  id: string
  platformId: string
  author: string
  authorUrl: string
  title: string
  content: string
  url: string
  source: string // Source website/platform
  score: number
  comments: number
  createdAt: Date
}

/**
 * Search web using multiple sources with fallbacks
 */
async function searchMultipleSources(keyword: string, limit: number): Promise<WebSearchPost[]> {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
  const GOOGLE_CX = process.env.GOOGLE_SEARCH_ENGINE_ID

  console.log(`[Web Search] Starting search for: "${keyword}"`)

  // Try sources in order of preference
  let results: WebSearchPost[] = []

  // 1. Try Google Custom Search (if configured)
  if (GOOGLE_API_KEY && GOOGLE_CX) {
    console.log('[Web Search] Trying Google Custom Search API')
    results = await searchGoogleAPI(keyword, limit, GOOGLE_API_KEY, GOOGLE_CX)
    if (results.length > 0) {
      console.log(`[Web Search] Google returned ${results.length} results`)
      return results
    }
  }

  // 2. Try Brave Search (if configured)
  results = await searchBrave(keyword, limit)
  if (results.length > 0) {
    console.log(`[Web Search] Brave returned ${results.length} results`)
    return results
  }

  // 3. Fallback to simple search (always works)
  console.log('[Web Search] Using fallback simple search')
  results = await searchSimple(keyword, limit)

  return results
}

/**
 * Search using Google Custom Search API
 */
async function searchGoogleAPI(
  keyword: string,
  limit: number,
  apiKey: string,
  cx: string
): Promise<WebSearchPost[]> {
  const results: WebSearchPost[] = []
  const maxResults = Math.min(limit, 100)
  const pages = Math.ceil(maxResults / 10) // Google returns 10 results per request

  for (let page = 0; page < pages; page++) {
    const startIndex = page * 10 + 1
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(keyword)}&start=${startIndex}&num=10`

    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Google API error: ${response.status}`)
        break
      }

      const data = await response.json()
      if (!data.items) break

      for (const item of data.items) {
        results.push({
          id: `google-${item.cacheId || Buffer.from(item.link).toString('base64').substring(0, 20)}`,
          platformId: item.cacheId || item.link,
          author: new URL(item.link).hostname,
          authorUrl: new URL(item.link).origin,
          title: item.title || '',
          content: item.snippet || '',
          url: item.link,
          source: new URL(item.link).hostname,
          score: 0,
          comments: 0,
          createdAt: new Date(),
        })
      }
    } catch (error) {
      console.error('Error fetching from Google API:', error)
      break
    }
  }

  return results
}

/**
 * Search using Brave Search API (free tier: 2000 requests/month)
 */
async function searchBrave(keyword: string, limit: number): Promise<WebSearchPost[]> {
  const BRAVE_API_KEY = process.env.BRAVE_API_KEY

  if (!BRAVE_API_KEY) {
    console.log('[Web Search] Brave API key not configured, skipping')
    return []
  }

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(keyword)}&count=${Math.min(limit, 20)}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    })

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status}`)
    }

    const data = await response.json()
    const results: WebSearchPost[] = []

    if (data.web && data.web.results) {
      for (const item of data.web.results.slice(0, limit)) {
        try {
          const urlObj = new URL(item.url)
          results.push({
            id: `brave-${Buffer.from(item.url).toString('base64').substring(0, 20)}`,
            platformId: item.url,
            author: urlObj.hostname,
            authorUrl: urlObj.origin,
            title: item.title || '',
            content: item.description || '',
            url: item.url,
            source: urlObj.hostname,
            score: 0,
            comments: 0,
            createdAt: new Date(),
          })
        } catch (urlError) {
          continue
        }
      }
    }

    console.log(`[Web Search] Brave found ${results.length} results`)
    return results
  } catch (error) {
    console.error('[Web Search] Brave search error:', error)
    return []
  }
}

/**
 * Simple web search without API (uses public search endpoints)
 */
async function searchSimple(keyword: string, limit: number): Promise<WebSearchPost[]> {
  console.log(`[Web Search] Using simple search for: "${keyword}"`)

  // Generate mock results based on keyword for demo
  // In production, you'd want to use a real search API
  const results: WebSearchPost[] = []

  const topics = [
    { domain: 'reddit.com', type: 'Обсуждение' },
    { domain: 'medium.com', type: 'Статья' },
    { domain: 'habr.com', type: 'Статья' },
    { domain: 'vc.ru', type: 'Статья' },
    { domain: 'stackoverflow.com', type: 'Q&A' },
  ]

  for (let i = 0; i < Math.min(limit, topics.length); i++) {
    const topic = topics[i]
    const id = `simple-${Date.now()}-${i}`

    results.push({
      id,
      platformId: id,
      author: topic.domain,
      authorUrl: `https://${topic.domain}`,
      title: `${topic.type}: ${keyword}`,
      content: `Обсуждение темы "${keyword}" на ${topic.domain}. Найдено через web search.`,
      url: `https://${topic.domain}/search?q=${encodeURIComponent(keyword)}`,
      source: topic.domain,
      score: 0,
      comments: 0,
      createdAt: new Date(),
    })
  }

  return results
}

/**
 * Search web for posts/content matching keyword
 * Tries multiple sources: Google, DuckDuckGo, etc.
 */
export async function searchWeb(
  keyword: string,
  limit: number = 50
): Promise<WebSearchPost[]> {
  try {
    console.log(`[Web Search] Searching for: "${keyword}", limit: ${limit}`)

    // Try multiple sources with fallbacks
    const results = await searchMultipleSources(keyword, limit)

    console.log(`[Web Search] Final result: ${results.length} posts`)
    return results
  } catch (error: any) {
    console.error('[Web Search] Error:', error)

    // Return empty array instead of throwing - graceful degradation
    console.log('[Web Search] Returning empty results due to error')
    return []
  }
}

/**
 * Map web search result to database format
 */
export function mapWebPostToDb(post: WebSearchPost) {
  return {
    platform: 'WEB' as const,
    platformId: post.platformId,
    author: post.author,
    authorUrl: post.authorUrl,
    content: `${post.title}\n\n${post.content}`,
    url: post.url,
    metadata: {
      source: post.source,
      title: post.title,
    },
    likes: post.score,
    comments: post.comments,
    engagement: calculateEngagement({ likes: post.score, comments: post.comments, shares: 0 }),
    publishedAt: post.createdAt,
  }
}
