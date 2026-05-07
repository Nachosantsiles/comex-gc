export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const detalle = db.prepare('SELECT * FROM detalle_compras WHERE id_item=?').get(id)
  const gi_items = db.prepare(
    'SELECT * FROM gastos_importacion_items WHERE id_item=? ORDER BY orden ASC'
  ).all(id)
  const otros_items = db.prepare(
    'SELECT * FROM otros_gastos_items WHERE id_item=? ORDER BY orden ASC'
  ).all(id)
  return NextResponse.json({ detalle, gi_items, otros_items })
}
