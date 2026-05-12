import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      permissions: string[]
      permVersion: number
    }
  }
  interface User {
    role?: string
    permissions?: string[]
    permVersion?: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    permissions: string[]
    permVersion: number
  }
}
