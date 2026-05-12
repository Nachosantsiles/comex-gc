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
      // ── Sign-in: enrich token with role + permissions from DB ────────────
      if (user) {
        const role: string = (user as any).role ?? 'viewer'
        // Defaults in case DB query fails
        token.role = role
        token.permVersion = 1
        token.permissions = computePermissions(role, [])

        try {
          const db = (await import('./db')).default

          const row = db
            .prepare('SELECT role, perm_version FROM users WHERE id=?')
            .get(String(user.id)) as { role: string; perm_version: number } | undefined

          // Fallback: try by email if id lookup fails
          const effectiveRow = row ?? (db
            .prepare('SELECT role, perm_version FROM users WHERE email=?')
            .get((user as any).email) as any)

          if (effectiveRow) {
            const overrides = db
              .prepare('SELECT permission, granted FROM user_permissions WHERE user_id=?')
              .all(String(user.id)) as { permission: string; granted: number }[]

            token.role = effectiveRow.role
            token.permVersion = effectiveRow.perm_version ?? 1
            token.permissions = computePermissions(effectiveRow.role, overrides)
          }
        } catch (err) {
          // DB query failed — log it but don't break sign-in
          console.error('[auth] jwt callback DB error:', err)
          // Defaults already set above
        }
      }

      // ── Force-refresh: admin changed permissions ──────────────────────────
      if (trigger === 'update' && token.sub) {
        try {
          const db = (await import('./db')).default
          const row = db
            .prepare('SELECT role, perm_version FROM users WHERE id=?')
            .get(token.sub) as { role: string; perm_version: number } | undefined

          if (row) {
            const overrides = db
              .prepare('SELECT permission, granted FROM user_permissions WHERE user_id=?')
              .all(token.sub) as { permission: string; granted: number }[]

            token.role = row.role
            token.permVersion = row.perm_version ?? 1
            token.permissions = computePermissions(row.role, overrides)
          }
        } catch (err) {
          console.error('[auth] jwt update trigger DB error:', err)
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        const u = session.user as any
        u.id = token.sub
        u.role = token.role ?? 'viewer'
        u.permissions = token.permissions ?? []
        u.permVersion = token.permVersion ?? 1
      }
      return session
    },
  },
  providers: [],
}
