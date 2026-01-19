export class PainRadarError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'PainRadarError'
  }
}

export class RedditAPIError extends PainRadarError {
  constructor(message: string) {
    super(message, 'REDDIT_API_ERROR', 503)
  }
}

export class AIAnalysisError extends PainRadarError {
  constructor(message: string) {
    super(message, 'AI_ANALYSIS_ERROR', 500)
  }
}

export class WorkspaceAccessError extends PainRadarError {
  constructor(message: string = 'Access to workspace denied') {
    super(message, 'WORKSPACE_ACCESS_ERROR', 403)
  }
}

export class ValidationError extends PainRadarError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
  }
}
