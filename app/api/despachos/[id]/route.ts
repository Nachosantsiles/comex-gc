export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const despacho = db.prepare('SELECT * FROM despachos WHERE id_despacho=?').get(id)
  if (!despacho) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const items = db.prepare('SELECT id_item FROM despacho_items WHERE id_despacho=?').all(id)
  return NextResponse.json({ ...despacho, items: items.map((r: any) => r.id_item) })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  db.prepare(`
    UPDATE despachos SET id_envio=?, turno_retiro=?, estado=?, canal=?,
      motivo_demora=?, fecha_oficializacion=?, fecha_liberacion=?, fecha_desconsolidacion=?,
      nombre_despachante=?, honorarios_pesos=?, tipo_cambio=?, honorarios_usd=?,
      gastos_extras_usd=?, updated_at=datetime('now')
    WHERE id_despacho=?
  `).run(
    body.id_envio, body.turno_retiro, body.estado, body.canal,
    body.motivo_demora, body.fecha_oficializacion, body.fecha_liberacion,
    body.fecha_desconsolidacion, body.nombre_despachante, body.honorarios_pesos,
    body.tipo_cambio, body.honorarios_usd, body.gastos_extras_usd, id
  )

  if (body.items) {
    db.prepare('DELETE FROM despacho_items WHERE id_despacho=?').run(id)
    const ins = db.prepare('INSERT OR IGNORE INTO despacho_items(id_despacho, id_item) VALUES (?,?)')
    body.items.forEach((id_item: string) => ins.run(id, id_item))
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  db.prepare('DELETE FROM despacho_items WHERE id_despacho=?').run(id)
  db.prepare('DELETE FROM despachos WHERE id_despacho=?').run(id)
  return NextResponse.json({ ok: true })
}
