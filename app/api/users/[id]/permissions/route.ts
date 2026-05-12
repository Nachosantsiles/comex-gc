export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/check-permission'
import db from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/users/[id]/permissions
 * Returns the user's role, role-default permissions, and per-user overrides.
 */
export async function GET(_: NextRequest, { params }: Params) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const user = db.prepare('SELECT role, perm_version FROM users WHERE id=?').get(id) as any
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const overrides = db
    .prepare('SELECT permission, granted FROM user_permissions WHERE user_id=?')
    .all(id) as { permission: string; granted: number }[]

  return NextResponse.json({ role: user.role, overrides })
}

/**
 * PUT /api/users/[id]/permissions
 * Body: { overrides: { permission: string; granted: boolean }[] }
 * Replaces all per-user overrides and bumps perm_version.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const { overrides } = await req.json() as { overrides: { permission: string; granted: boolean }[] }

  const deleteStmt = db.prepare('DELETE FROM user_permissions WHERE user_id=?')
  const insertStmt = db.prepare(
    'INSERT INTO user_permissions(user_id, permission, granted) VALUES (?,?,?)'
  )
  const bumpVersion = db.prepare('UPDATE users SET perm_version = perm_version + 1 WHERE id=?')

  db.transaction(() => {
    deleteStmt.run(id)
    for (const o of overrides) {
      insertStmt.run(id, o.permission, o.granted ? 1 : 0)
    }
    bumpVersion.run(id)
  })()

  return NextResponse.json({ ok: true })
}
