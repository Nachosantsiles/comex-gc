import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/session-reset
 * Clears all NextAuth session cookies (including __Secure- prefixed)
 * and redirects to /login for a fresh login.
 */
export async function GET(req: NextRequest) {
  const isSecure = req.nextUrl.protocol === 'https:'
  const res = NextResponse.redirect(new URL('/login', req.url))

  const cookieNames = [
    '__Secure-authjs.session-token',
    'authjs.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
  ]

  for (const name of cookieNames) {
    res.cookies.set({ name, value: '', expires: new Date(0), path: '/', httpOnly: true, secure: isSecure, sameSite: 'lax' })
  }

  return res
}
