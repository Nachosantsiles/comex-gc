import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/clear-session?callbackUrl=/login
 * Clears all NextAuth session cookies (including __Secure- prefixed ones)
 * and redirects to the given callbackUrl.
 */
export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') ?? '/login'
  const res = NextResponse.redirect(new URL(callbackUrl, req.url))

  const isSecure = req.nextUrl.protocol === 'https:'

  // Clear all possible NextAuth v5 session cookie variants
  const cookieNames = [
    '__Secure-authjs.session-token',
    'authjs.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
  ]

  for (const name of cookieNames) {
    res.cookies.set({
      name,
      value: '',
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
    })
  }

  return res
}
