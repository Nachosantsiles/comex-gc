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
      // Old token without RBAC data → clear session and let them log in fresh
      if (rawPermissions === undefined) {
        const res = NextResponse.redirect(new URL('/login', req.url))
        res.cookies.delete('__Secure-authjs.session-token')
        res.cookies.delete('authjs.session-token')
        return res
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  if (!isAuth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Route-level permission check from JWT (Edge-compatible — no DB access)
  const rawPermissions = (token as any).permissions

  // Old token without RBAC data → clear session and redirect to login
  if (rawPermissions === undefined) {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete('__Secure-authjs.session-token')
    res.cookies.delete('authjs.session-token')
    return res
  }

  const permissions: string[] = rawPermissions

  for (const [route, requiredPerm] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      if (!permissions.includes(requiredPerm)) {
        const fallback = findFirstAccessibleRoute(permissions)
        // No accessible routes → clear session to avoid loops
        if (fallback === '/login') {
          const res = NextResponse.redirect(new URL('/login', req.url))
          res.cookies.delete('__Secure-authjs.session-token')
          res.cookies.delete('authjs.session-token')
          return res
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|api/health|api/debug-auth).*)'],
}
