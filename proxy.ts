import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { ROUTE_PERMISSION_MAP, findFirstAccessibleRoute } from './lib/permissions'

export async function proxy(req: NextRequest) {
  const secureCookie = req.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production'
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie })
  const isAuth = !!token
  const pathname = req.nextUrl.pathname
  const isLoginPage = pathname.startsWith('/login')

  if (isLoginPage) {
    if (isAuth) return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.next()
  }

  if (!isAuth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Route-level permission check from JWT (Edge-compatible — no DB access)
  const permissions: string[] = (token as any).permissions ?? []

  for (const [route, requiredPerm] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      if (!permissions.includes(requiredPerm)) {
        // Redirect to first accessible route to avoid loops
        const fallback = findFirstAccessibleRoute(permissions)
        if (fallback === '/login') {
          return NextResponse.redirect(new URL('/login', req.url))
        }
        // Don't redirect if the fallback is the same as current path (would loop)
        if (fallback !== pathname) {
          return NextResponse.redirect(new URL(fallback, req.url))
        }
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
