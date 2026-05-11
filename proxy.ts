import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(req: NextRequest) {
  const secureCookie = req.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production'
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie })
  const isAuth = !!token
  const isLoginPage = req.nextUrl.pathname.startsWith('/login')

  if (isLoginPage) {
    if (isAuth) return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.next()
  }

  if (!isAuth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
