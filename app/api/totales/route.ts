export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde') || ''
  const hasta = searchParams.get('hasta') || ''

  const dateFilter = `
    ${desde ? `AND date(i.created_at) >= '${desde}'` : ''}
    ${hasta ? `AND date(i.created_at) <= '${hasta}'` : ''}
  `

  const rows = db.prepare(`
    SELECT
      i.id_item,
      i.detalle,
      i.id_envio,
      i.estado,
      i.estado_documentacion,
      i.eta as envio_eta,
      COALESCE(dc.precio_usd, 0) as valor_real_usd,
      COALESCE(dc.precio_sf_usd, 0) as comision_sf_usd,
      COALESCE(dc.precio_usd, 0) + COALESCE(dc.precio_sf_usd, 0) as total_sf_usd,
      COALESCE(
        (SELECT SUM(gii.monto_usd) FROM gastos_importacion_items gii WHERE gii.id_item = i.id_item), 0
      ) as total_gi,
      COALESCE(
        (SELECT SUM(ogi.total_usd) FROM otros_gastos_items ogi WHERE ogi.id_item = i.id_item), 0
      ) as total_otros,
      COALESCE(
        (SELECT SUM(gp.gasto_proporcional_usd) FROM gastos_proporcionales gp WHERE gp.id_item = i.id_item), 0
      ) as gasto_log,
      COALESCE(
        (SELECT
          CASE WHEN cnt.total_items > 0
            THEN (d.honorarios_usd + COALESCE(d.gastos_extras_usd, 0)) / cnt.total_items
            ELSE 0
          END
         FROM despacho_items di
         JOIN despachos d ON d.id_despacho = di.id_despacho
         JOIN (
           SELECT id_despacho, COUNT(*) as total_items FROM despacho_items GROUP BY id_despacho
         ) cnt ON cnt.id_despacho = di.id_despacho
         WHERE di.id_item = i.id_item
         LIMIT 1
        ), 0
      ) as honorarios_despacho_usd
    FROM items i
    LEFT JOIN detalle_compras dc ON dc.id_item = i.id_item
    WHERE 1=1 ${dateFilter}
    ORDER BY i.created_at DESC
  `).all() as any[]

  const result = rows.map(r => ({
    ...r,
    total_operacion_usd:
      (r.total_sf_usd || 0) +
      (r.total_gi || 0) +
      (r.total_otros || 0) +
      (r.gasto_log || 0) +
      (r.honorarios_despacho_usd || 0),
  }))

  return NextResponse.json(result)
}
