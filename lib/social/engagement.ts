/**
 * Calculate engagement score for a social media post
 * Uses weighted formula: comments > shares > likes
 */
export function calculateEngagement(post: {
  likes: number
  comments: number
  shares: number
}): number {
  return (post.comments * 3) + (post.shares * 2) + post.likes
}
