export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { initializeDatabase } from '@/lib/schema'

initializeDatabase()

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params

  const item = db.prepare('SELECT id_item, estado_documentacion, created_at FROM items WHERE id_item=?').get(id) as any
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const rows = db.prepare(
    `SELECT * FROM historial_doc_items WHERE id_item=? ORDER BY fecha_cambio ASC, created_at ASC`
  ).all(id)

  return NextResponse.json({ item, historial: rows })
}
