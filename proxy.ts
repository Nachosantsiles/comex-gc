import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { ROUTE_PERMISSION_MAP, findFirstAccessibleRoute } from './lib/permissions'

/** Delete all possible NextAuth session cookie variants from a response */
function clearSessionCookies(res: NextResponse) {
  const names = [
    '__Secure-authjs.session-token',
    'authjs.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
  ]
  for (const name of names) {
    // Must include secure:true for __Secure- prefixed cookies to be accepted by browser
    res.cookies.set({ name, value: '', expires: new Date(0), path: '/', httpOnly: true, secure: true, sameSite: 'lax' })
  }
}

export async function proxy(req: NextRequest) {
  const secureCookie = req.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production'
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie })
  const isAuth = !!token
  const pathname = req.nextUrl.pathname
  const isLoginPage = pathname.startsWith('/login')

  if (isLoginPage) {
    if (isAuth) {
      const rawPermissions = (token as any).permissions
      if (rawPermissions === undefined) {
        // Old token (pre-RBAC): show login page AND clear stale cookie in one shot
        const res = NextResponse.next()
        clearSessionCookies(res)
        return res
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  if (!isAuth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const rawPermissions = (token as any).permissions

  if (rawPermissions === undefined) {
    // Old token on protected route: redirect to login and clear cookie
    const res = NextResponse.redirect(new URL('/login', req.url))
    clearSessionCookies(res)
    return res
  }

  const permissions: string[] = rawPermissions

  for (const [route, requiredPerm] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      if (!permissions.includes(requiredPerm)) {
        const fallback = findFirstAccessibleRoute(permissions)
        if (fallback === '/login') {
          const res = NextResponse.redirect(new URL('/login', req.url))
          clearSessionCookies(res)
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|api/health|api/debug-auth|api/session-reset).*)'],
}
