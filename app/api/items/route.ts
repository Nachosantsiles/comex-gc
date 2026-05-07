export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { nextId } from '@/lib/schema'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id_envio = searchParams.get('id_envio')

  let query = `
    SELECT i.*,
      e.ref_contenedor, e.tipo_transporte,
      e.etd as envio_etd, e.eta as envio_eta
    FROM items i
    LEFT JOIN envios e ON e.id_envio = i.id_envio
  `
  const args: any[] = []
  if (id_envio) { query += ' WHERE i.id_envio=?'; args.push(id_envio) }
  query += ' ORDER BY i.created_at DESC'

  return NextResponse.json(db.prepare(query).all(...args))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const id_item = nextId('ITEM', 'item')

  // Get ETD/ETA from the parent envío
  const envio = body.id_envio
    ? db.prepare('SELECT etd, eta FROM envios WHERE id_envio=?').get(body.id_envio) as any
    : null

  db.prepare(`
    INSERT INTO items (id_item, id_envio, detalle, shipper, consignee, nro_factura,
      valor_total_factura, moneda, estado_documentacion, estado, destino_final, eta, etd,
      tipo_importacion, categoria)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id_item, body.id_envio, body.detalle, body.shipper, body.consignee, body.nro_factura,
    body.valor_total_factura, body.moneda, body.estado_documentacion,
    body.estado, body.destino_final,
    envio?.eta ?? null, envio?.etd ?? null,
    body.tipo_importacion ?? null, body.categoria ?? null
  )

  return NextResponse.json({ id_item }, { status: 201 })
}
