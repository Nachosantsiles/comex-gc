export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { initializeDatabase } from '@/lib/schema'

initializeDatabase()

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rows = db.prepare(
    `SELECT nombre FROM proveedores_internacionales WHERE activo=1 ORDER BY nombre ASC`
  ).all() as { nombre: string }[]
  return NextResponse.json(rows.map(r => r.nombre))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { nombre } = await req.json()
  if (!nombre?.trim()) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })
  db.prepare(`INSERT OR IGNORE INTO proveedores_internacionales(nombre) VALUES (?)`).run(nombre.trim())
  return NextResponse.json({ ok: true }, { status: 201 })
}
