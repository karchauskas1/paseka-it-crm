import { RedditAPIError } from '../pain-radar/errors'
import { calculateEngagement } from './engagement'

/**
 * Reddit JSON API (public, no authentication required)
 * Fallback if credentials are not configured
 */
async function searchRedditPublic(keyword: string, limit: number): Promise<any[]> {
  const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&limit=${limit}&sort=relevance&t=week`

  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'PASEKA_CRM_PainRadar/1.0.0',
    },
  })

  if (!response.ok) {
    throw new RedditAPIError(`Reddit API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.children.map((child: any) => child.data)
}

export interface RedditPost {
  id: string
  platformId: string
  author: string
  authorUrl: string
  title: string
  content: string
  url: string
  subreddit: string
  score: number
  comments: number
  createdAt: Date
}

/**
 * Search Reddit for posts matching keyword
 * Uses public JSON API (no authentication required!)
 */
export async function searchReddit(
  keyword: string,
  limit: number = 50
): Promise<RedditPost[]> {
  try {
    // Use public Reddit JSON API
    const results = await searchRedditPublic(keyword, Math.min(limit, 100))

    // Map results to our format
    return results.map(post => {
      const content = post.selftext || post.title

      return {
        id: post.id,
        platformId: post.id, // Reddit post ID
        author: post.author,
        authorUrl: `https://reddit.com/user/${post.author}`,
        title: post.title,
        content,
        url: `https://reddit.com${post.permalink}`,
        subreddit: post.subreddit,
        score: post.score,
        comments: post.num_comments,
        createdAt: new Date(post.created_utc * 1000),
      }
    })
  } catch (error: any) {
    console.error('Reddit API error:', error)

    // Handle specific Reddit API errors
    if (error.statusCode === 401) {
      throw new RedditAPIError('Reddit API authentication failed')
    } else if (error.statusCode === 429) {
      throw new RedditAPIError('Reddit API rate limit exceeded')
    } else if (error.statusCode === 503) {
      throw new RedditAPIError('Reddit API temporarily unavailable')
    }

    throw new RedditAPIError(`Reddit API error: ${error.message}`)
  }
}

/**
 * Map Reddit post to database format
 */
export function mapRedditPostToDb(post: RedditPost) {
  return {
    platform: 'REDDIT' as const,
    platformId: post.platformId,
    author: post.author,
    authorUrl: post.authorUrl,
    content: post.content,
    url: post.url,
    likes: post.score,
    comments: post.comments,
    shares: 0, // Reddit doesn't have shares
    engagement: calculateEngagement({
      likes: post.score,
      comments: post.comments,
      shares: 0,
    }),
    publishedAt: post.createdAt,
  }
}
