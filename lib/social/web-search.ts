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
 * Search Google for relevant content
 * Uses Google Custom Search JSON API if available, otherwise scrapes
 */
async function searchGoogle(keyword: string, limit: number): Promise<WebSearchPost[]> {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
  const GOOGLE_CX = process.env.GOOGLE_SEARCH_ENGINE_ID

  // If API keys are configured, use Google Custom Search API
  if (GOOGLE_API_KEY && GOOGLE_CX) {
    return searchGoogleAPI(keyword, limit, GOOGLE_API_KEY, GOOGLE_CX)
  }

  // Otherwise use DuckDuckGo (no API key needed)
  return searchDuckDuckGo(keyword, limit)
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
 * Search using DuckDuckGo (no API key required)
 */
async function searchDuckDuckGo(keyword: string, limit: number): Promise<WebSearchPost[]> {
  // DuckDuckGo HTML API (simple scraping)
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`DuckDuckGo error: ${response.status}`)
    }

    const html = await response.text()

    // Simple regex-based extraction (basic, but works without dependencies)
    const results: WebSearchPost[] = []
    const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]+)</g

    let match
    let index = 0
    while ((match = resultRegex.exec(html)) && index < limit) {
      const [, url, title, snippet] = match
      const cleanUrl = url.replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/, '').split('&')[0]
      const decodedUrl = decodeURIComponent(cleanUrl)

      try {
        const urlObj = new URL(decodedUrl.startsWith('http') ? decodedUrl : `https://${decodedUrl}`)
        results.push({
          id: `ddg-${Buffer.from(urlObj.href).toString('base64').substring(0, 20)}`,
          platformId: urlObj.href,
          author: urlObj.hostname,
          authorUrl: urlObj.origin,
          title: title.trim(),
          content: snippet.trim(),
          url: urlObj.href,
          source: urlObj.hostname,
          score: 0,
          comments: 0,
          createdAt: new Date(),
        })
        index++
      } catch (urlError) {
        // Skip invalid URLs
      }
    }

    return results
  } catch (error) {
    console.error('DuckDuckGo search error:', error)
    return []
  }
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

    // Try Google/DuckDuckGo
    const results = await searchGoogle(keyword, limit)

    console.log(`[Web Search] Found ${results.length} results`)
    return results
  } catch (error: any) {
    console.error('[Web Search] Error:', error)
    throw new RedditAPIError(`Web search failed: ${error.message}`)
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
    engagement: calculateEngagement(post.score, post.comments),
    publishedAt: post.createdAt,
  }
}
