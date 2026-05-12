import { NextResponse } from 'next/server'
import { auth } from './auth'
import db from './db'
import type { Permission } from './permissions'

function unauthorized() {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

function forbidden() {
  return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
}

/**
 * Server-side permission guard for API routes.
 * Checks the session JWT and validates the perm_version against the DB
 * to detect stale tokens after an admin changes permissions.
 *
 * Usage:
 *   const { session, error } = await requirePermission('envios:view')
 *   if (error) return error
 */
export async function requirePermission(permission: Permission) {
  const session = await auth()
  if (!session?.user) return { session: null, error: unauthorized() }

  const u = session.user as any
  const perms: string[] = u.permissions ?? []

  // Lightweight staleness check — one DB query
  try {
    const dbUser = db.prepare('SELECT perm_version FROM users WHERE id=?').get(u.id) as any
    if (dbUser && dbUser.perm_version !== (u.permVersion ?? 1)) {
      return {
        session: null,
        error: NextResponse.json(
          { error: 'Permisos actualizados, por favor recargá la página', code: 'PERM_STALE' },
          { status: 401 }
        ),
      }
    }
  } catch (_) {}

  if (!perms.includes(permission)) return { session: null, error: forbidden() }
  return { session, error: null }
}

/**
 * Admin-only guard. Checks role directly (no permission lookup needed).
 */
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { session: null, error: unauthorized() }
  const u = session.user as any
  if (u.role !== 'admin') return { session: null, error: forbidden() }
  return { session, error: null }
}
