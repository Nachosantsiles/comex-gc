export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const db = (await import('@/lib/db')).default
    const { initializeDatabase } = await import('@/lib/schema')
    initializeDatabase()

    const userCount = (db.prepare('SELECT COUNT(*) as n FROM users').get() as any).n
    const admin = db.prepare('SELECT id, email, role, active FROM users WHERE email=?').get('admin@cazorla.com') as any

    return NextResponse.json({
      ok: true,
      userCount,
      adminExists: !!admin,
      admin: admin ? { id: admin.id, email: admin.email, role: admin.role, active: admin.active } : null,
      dbPath: process.env.DATABASE_PATH ?? 'default (process.cwd()/data/comex.db)',
      authSecret: process.env.AUTH_SECRET ? `set (${process.env.AUTH_SECRET.length} chars)` : 'NOT SET',
      nextauthSecret: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 })
  }
}
