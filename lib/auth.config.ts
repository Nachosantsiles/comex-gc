import type { NextAuthConfig } from 'next-auth'
import { computePermissions } from './permissions'

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLoginPage = nextUrl.pathname.startsWith('/login')
      if (isLoginPage) return isLoggedIn ? Response.redirect(new URL('/dashboard', nextUrl)) : true
      return isLoggedIn
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        // Fresh sign-in: load role + permissions from DB
        try {
          const db = (await import('./db')).default
          const row = db.prepare('SELECT role, perm_version FROM users WHERE id=?').get(user.id) as any
          const overrides = db.prepare('SELECT permission, granted FROM user_permissions WHERE user_id=?').all(user.id) as any[]
          token.role = row?.role ?? (user as any).role ?? 'viewer'
          token.permVersion = row?.perm_version ?? 1
          token.permissions = computePermissions(token.role, overrides)
        } catch (_) {
          token.role = (user as any).role ?? 'viewer'
          token.permVersion = 1
          token.permissions = computePermissions(token.role, [])
        }
      }
      if (trigger === 'update' && token.sub) {
        // Force-refresh permissions (called after admin changes perms)
        try {
          const db = (await import('./db')).default
          const row = db.prepare('SELECT role, perm_version FROM users WHERE id=?').get(token.sub) as any
          if (row) {
            const overrides = db.prepare('SELECT permission, granted FROM user_permissions WHERE user_id=?').all(token.sub) as any[]
            token.role = row.role
            token.permVersion = row.perm_version ?? 1
            token.permissions = computePermissions(row.role, overrides)
          }
        } catch (_) {}
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as any
        u.id = token.sub
        u.role = token.role
        u.permissions = token.permissions ?? []
        u.permVersion = token.permVersion ?? 1
      }
      return session
    },
  },
  providers: [],
}
