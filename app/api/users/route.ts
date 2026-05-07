export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const user = (session.user as any)
  if (user.role !== 'admin') return NextResponse.json({ error: 'Prohibido' }, { status: 403 })

  const users = db.prepare('SELECT id, name, email, role, active, created_at FROM users ORDER BY id').all()
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const user = (session.user as any)
  if (user.role !== 'admin') return NextResponse.json({ error: 'Prohibido' }, { status: 403 })

  const body = await req.json()
  const hash = bcrypt.hashSync(body.password, 10)
  db.prepare('INSERT INTO users(name, email, password_hash, role) VALUES (?,?,?,?)').run(
    body.name, body.email, hash, body.role ?? 'viewer'
  )
  return NextResponse.json({ ok: true }, { status: 201 })
}
