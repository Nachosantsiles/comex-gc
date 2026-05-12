'use client'
import { useSession } from 'next-auth/react'
import type { Permission } from '@/lib/permissions'

/** Returns true if the current user has the given permission */
export function usePermission(permission: Permission): boolean {
  const { data: session } = useSession()
  const perms: string[] = (session?.user as any)?.permissions ?? []
  return perms.includes(permission)
}

/** Returns the full permissions array for the current user */
export function usePermissions(): string[] {
  const { data: session } = useSession()
  return (session?.user as any)?.permissions ?? []
}

/** Returns the current user's role string */
export function useRole(): string {
  const { data: session } = useSession()
  return (session?.user as any)?.role ?? ''
}
