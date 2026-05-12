import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const isSecure = req.nextUrl.protocol === 'https:'

  // Use public URL from env — Railway's internal req.url uses localhost
  const publicOrigin =
    process.env.AUTH_URL?.replace(/\/$/, '') ??
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ??
    req.nextUrl.origin

  const res = NextResponse.redirect(`${publicOrigin}/login`)

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
