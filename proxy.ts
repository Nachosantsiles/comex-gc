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
    if (isAuth) {
      const rawPermissions = (token as any).permissions
      // Old token without RBAC data → clear session so user can log in fresh
      if (rawPermissions === undefined) {
        return NextResponse.redirect(new URL('/api/session-reset', req.url))
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  if (!isAuth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const rawPermissions = (token as any).permissions

  // Old token without RBAC data → clear session
  if (rawPermissions === undefined) {
    return NextResponse.redirect(new URL('/api/session-reset', req.url))
  }

  const permissions: string[] = rawPermissions

  for (const [route, requiredPerm] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      if (!permissions.includes(requiredPerm)) {
        const fallback = findFirstAccessibleRoute(permissions)
        if (fallback === '/login') {
          return NextResponse.redirect(new URL('/api/session-reset', req.url))
        }
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
  // Exclude: Next.js internals, auth endpoints, diagnostic endpoints, session-reset
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|api/health|api/debug-auth|api/session-reset).*)'],
}
