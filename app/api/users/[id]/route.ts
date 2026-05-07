export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const me = (session.user as any)
  if (me.role !== 'admin') return NextResponse.json({ error: 'Prohibido' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  if (body.password) {
    const hash = bcrypt.hashSync(body.password, 10)
    db.prepare('UPDATE users SET name=?, email=?, role=?, active=?, password_hash=? WHERE id=?').run(
      body.name, body.email, body.role, body.active ? 1 : 0, hash, id
    )
  } else {
    db.prepare('UPDATE users SET name=?, email=?, role=?, active=? WHERE id=?').run(
      body.name, body.email, body.role, body.active ? 1 : 0, id
    )
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const me = (session.user as any)
  if (me.role !== 'admin') return NextResponse.json({ error: 'Prohibido' }, { status: 403 })
  const { id } = await params
  db.prepare('DELETE FROM users WHERE id=?').run(id)
  return NextResponse.json({ ok: true })
}
