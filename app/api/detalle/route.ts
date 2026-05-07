export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rows = db.prepare(`
    SELECT dc.*,
      i.detalle as item_detalle, i.id_envio,
      COALESCE((SELECT SUM(gii.monto_usd) FROM gastos_importacion_items gii WHERE gii.id_item = dc.id_item), 0) as total_gi
    FROM detalle_compras dc
    LEFT JOIN items i ON i.id_item = dc.id_item
    ORDER BY dc.created_at DESC
  `).all()

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()

  const existing = db.prepare('SELECT id FROM detalle_compras WHERE id_item=?').get(body.id_item)
  if (existing) {
    db.prepare(`
      UPDATE detalle_compras SET id_despacho=?, proveedor_internacional=?, precio_orig=?,
        moneda_orig=?, tc_a_usd=?, precio_usd=?, comision_sf_pct=?, precio_sf_usd=?,
        valor_factura_sf=?, nro_factura_sf=?, fecha_factura_sf=?,
        moneda_sf=?, tc_sf_a_usd=?,
        sf_mercaderia=?, sf_flete=?, sf_seguro=?, total_sf=?, total_sf_usd=?,
        updated_at=datetime('now')
      WHERE id_item=?
    `).run(
      body.id_despacho, body.proveedor_internacional, body.precio_orig, body.moneda_orig,
      body.tc_a_usd, body.precio_usd, body.comision_sf_pct ?? 10, body.precio_sf_usd,
      body.valor_factura_sf, body.nro_factura_sf, body.fecha_factura_sf,
      body.moneda_sf ?? 'EUR', body.tc_sf_a_usd ?? 1,
      body.sf_mercaderia, body.sf_flete, body.sf_seguro, body.total_sf, body.total_sf_usd,
      body.id_item
    )
  } else {
    db.prepare(`
      INSERT INTO detalle_compras (id_item, id_despacho, proveedor_internacional, precio_orig,
        moneda_orig, tc_a_usd, precio_usd, comision_sf_pct, precio_sf_usd, valor_factura_sf,
        nro_factura_sf, fecha_factura_sf, moneda_sf, tc_sf_a_usd,
        sf_mercaderia, sf_flete, sf_seguro, total_sf, total_sf_usd)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      body.id_item, body.id_despacho, body.proveedor_internacional, body.precio_orig,
      body.moneda_orig, body.tc_a_usd, body.precio_usd, body.comision_sf_pct ?? 10,
      body.precio_sf_usd, body.valor_factura_sf, body.nro_factura_sf, body.fecha_factura_sf,
      body.moneda_sf ?? 'EUR', body.tc_sf_a_usd ?? 1,
      body.sf_mercaderia, body.sf_flete, body.sf_seguro, body.total_sf, body.total_sf_usd
    )
  }

  // Gastos de importación dinámicos
  if (body.gastos_importacion_items !== undefined) {
    db.prepare('DELETE FROM gastos_importacion_items WHERE id_item=?').run(body.id_item)
    const ins = db.prepare(
      `INSERT INTO gastos_importacion_items(id_item, concepto, monto_usd, orden) VALUES (?,?,?,?)`
    )
    body.gastos_importacion_items.forEach((gi: any, idx: number) => {
      if (gi.concepto?.trim()) ins.run(body.id_item, gi.concepto.trim(), gi.monto_usd ?? 0, idx)
    })
  }

  // Otros gastos dinámicos
  if (body.otros_gastos_items !== undefined) {
    db.prepare('DELETE FROM otros_gastos_items WHERE id_item=?').run(body.id_item)
    const ins = db.prepare(
      `INSERT INTO otros_gastos_items(id_item, concepto, precio_pesos, tipo_cambio, total_usd, orden) VALUES (?,?,?,?,?,?)`
    )
    body.otros_gastos_items.forEach((og: any, idx: number) => {
      if (og.concepto?.trim()) ins.run(body.id_item, og.concepto.trim(), og.precio_pesos ?? null, og.tipo_cambio ?? null, og.total_usd ?? null, idx)
    })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
