export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { initializeDatabase } from '@/lib/schema'

initializeDatabase()

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tipo = new URL(req.url).searchParams.get('tipo')
  if (!tipo) return NextResponse.json({ error: 'tipo requerido' }, { status: 400 })
  const rows = db.prepare(
    `SELECT valor FROM catalogos WHERE tipo=? AND activo=1 ORDER BY valor ASC`
  ).all(tipo) as { valor: string }[]
  return NextResponse.json(rows.map(r => r.valor))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { tipo, valor } = await req.json()
  if (!tipo || !valor?.trim()) return NextResponse.json({ error: 'tipo y valor requeridos' }, { status: 400 })
  try {
    db.prepare(`INSERT OR IGNORE INTO catalogos(tipo, valor) VALUES (?,?)`).run(tipo, valor.trim())
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { tipo, valor } = await req.json()
  db.prepare(`UPDATE catalogos SET activo=0 WHERE tipo=? AND valor=?`).run(tipo, valor)
  return NextResponse.json({ ok: true })
}
