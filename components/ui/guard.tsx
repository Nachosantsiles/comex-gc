'use client'
import { useSession } from 'next-auth/react'
import type { Permission } from '@/lib/permissions'

interface GuardProps {
  permission: Permission
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Renders children only if the current user has the given permission.
 * While the session is loading, renders nothing.
 *
 * Usage:
 *   <Guard permission="envios:delete">
 *     <Button>Eliminar</Button>
 *   </Guard>
 */
export function Guard({ permission, fallback = null, children }: GuardProps) {
  const { data: session, status } = useSession()
  if (status === 'loading') return null
  const perms: string[] = (session?.user as any)?.permissions ?? []
  if (!perms.includes(permission)) return <>{fallback}</>
  return <>{children}</>
}
