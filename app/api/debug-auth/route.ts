export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const db = (await import('@/lib/db')).default
    const { initializeDatabase } = await import('@/lib/schema')

    let initError: string | null = null
    try {
      initializeDatabase()
    } catch (e: any) {
      initError = e?.message
    }

    const userCount = (db.prepare('SELECT COUNT(*) as n FROM users').get() as any).n
    const admin = db.prepare(
      'SELECT id, email, role, active, perm_version FROM users WHERE email=?'
    ).get('admin@cazorla.com') as any

    const userTableSql = (db.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
    ).get() as any)?.sql ?? ''

    const hasPT = (db.prepare(
      "SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name='user_permissions'"
    ).get() as any).n

    return NextResponse.json({
      ok: true,
      initError,
      userCount,
      adminExists: !!admin,
      admin: admin
        ? { id: admin.id, email: admin.email, role: admin.role, active: admin.active, perm_version: admin.perm_version }
        : null,
      dbPath: process.env.DATABASE_PATH ?? 'default (process.cwd()/data/comex.db)',
      authSecret: process.env.AUTH_SECRET
        ? `set (${process.env.AUTH_SECRET.length} chars)`
        : 'NOT SET ❌',
      nextauthSecret: process.env.NEXTAUTH_SECRET ? 'set (legacy)' : 'not set',
      schema: {
        user_permissions_table: hasPT === 1,
        users_has_perm_version: userTableSql.includes('perm_version'),
        users_has_old_check: userTableSql.includes("CHECK(role IN ('admin','editor','viewer'))"),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 })
  }
}
