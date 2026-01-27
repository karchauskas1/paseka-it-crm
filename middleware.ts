import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Публичные пути, которые не требуют авторизации
  const publicPaths = [
    '/brief/',
    '/api/briefs/public/',
    '/login',
    '/register',
  ]

  // Проверяем, является ли путь публичным
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  if (isPublicPath) {
    // Для публичных путей пропускаем без проверок
    return NextResponse.next()
  }

  // Для остальных путей Next.js обработает сам
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
