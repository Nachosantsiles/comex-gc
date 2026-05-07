export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const item = db.prepare(`
    SELECT i.*, e.etd as envio_etd, e.eta as envio_eta
    FROM items i
    LEFT JOIN envios e ON e.id_envio = i.id_envio
    WHERE i.id_item=?
  `).get(id)
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  // ETD/ETA come from envío, not from form
  const envio = body.id_envio
    ? db.prepare('SELECT etd, eta FROM envios WHERE id_envio=?').get(body.id_envio) as any
    : null

  db.prepare(`
    UPDATE items SET id_envio=?, detalle=?, shipper=?, consignee=?, nro_factura=?,
      valor_total_factura=?, moneda=?, estado_documentacion=?, estado=?,
      destino_final=?, eta=?, etd=?, tipo_importacion=?, categoria=?,
      updated_at=datetime('now')
    WHERE id_item=?
  `).run(
    body.id_envio, body.detalle, body.shipper, body.consignee, body.nro_factura,
    body.valor_total_factura, body.moneda, body.estado_documentacion,
    body.estado, body.destino_final,
    envio?.eta ?? null, envio?.etd ?? null,
    body.tipo_importacion ?? null, body.categoria ?? null, id
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  db.prepare('DELETE FROM items WHERE id_item=?').run(id)
  return NextResponse.json({ ok: true })
}
