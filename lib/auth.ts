import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import db from './db'
import { initializeDatabase } from './schema'
import { authConfig } from './auth.config'

initializeDatabase()

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(credentials.email) as any
        if (!user) return null
        const valid = bcrypt.compareSync(credentials.password as string, user.password_hash)
        if (!valid) return null
        return { id: String(user.id), name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
})
