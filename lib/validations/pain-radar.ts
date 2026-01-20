import { z } from 'zod'

// Pain Keyword schemas
export const painKeywordSchema = z.object({
  keyword: z.string()
    .min(2, 'Минимум 2 символа')
    .max(100, 'Максимум 100 символов')
    .regex(/^[a-zA-Z0-9\s\-_а-яА-ЯёЁ]+$/, 'Только буквы, цифры, пробелы, - и _'),
  category: z.string().max(50).optional(),
})

export const painKeywordUpdateSchema = z.object({
  keyword: z.string()
    .min(2, 'Минимум 2 символа')
    .max(100, 'Максимум 100 символов')
    .regex(/^[a-zA-Z0-9\s\-_а-яА-ЯёЁ]+$/, 'Только буквы, цифры, пробелы, - и _')
    .optional(),
  category: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
})

// Scan schemas
export const scanRequestSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  keywordId: z.string().uuid('Invalid keyword ID'),
  limit: z.number().int().min(1).max(100).default(50),
  platform: z.enum(['REDDIT', 'WEB', 'TWITTER', 'THREADS', 'INSTAGRAM', 'PIKABU']).default('WEB'),
})

// Post analysis schemas
export const analyzeRequestSchema = z.object({
  postIds: z.array(z.string().uuid()).min(1, 'Минимум 1 пост').max(50, 'Максимум 50 постов'),
  workspaceId: z.string().uuid('Invalid workspace ID'),
})

// Pain filter schemas
export const painFilterSchema = z.object({
  category: z.enum([
    'TIME_MANAGEMENT',
    'COST',
    'TECHNICAL',
    'PROCESS',
    'COMMUNICATION',
    'QUALITY',
    'SCALABILITY',
    'SECURITY',
    'OTHER'
  ]).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['frequency', 'trend', 'createdAt', 'severity']).default('createdAt'),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

// Pain update schema
export const painUpdateSchema = z.object({
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  category: z.enum([
    'TIME_MANAGEMENT',
    'COST',
    'TECHNICAL',
    'PROCESS',
    'COMMUNICATION',
    'QUALITY',
    'SCALABILITY',
    'SECURITY',
    'OTHER'
  ]).optional(),
  linkedProjectIds: z.array(z.string().uuid()).optional(),
})

// Project matching schema
export const matchProjectsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  painId: z.string().uuid('Invalid pain ID'),
})

// Dashboard query schema
export const dashboardQuerySchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  period: z.enum(['7d', '30d', '90d']).default('30d'),
})

// Post query schema
export const postsQuerySchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  keywordId: z.string().uuid().optional(),
  isAnalyzed: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

// Types for validated data
export type PainKeywordInput = z.infer<typeof painKeywordSchema>
export type PainKeywordUpdate = z.infer<typeof painKeywordUpdateSchema>
export type ScanRequest = z.infer<typeof scanRequestSchema>
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>
export type PainFilter = z.infer<typeof painFilterSchema>
export type PainUpdate = z.infer<typeof painUpdateSchema>
export type MatchProjectsRequest = z.infer<typeof matchProjectsSchema>
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>
export type PostsQuery = z.infer<typeof postsQuerySchema>
