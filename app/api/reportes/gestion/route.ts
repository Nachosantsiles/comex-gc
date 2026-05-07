export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { initializeDatabase } from '@/lib/schema'

initializeDatabase()

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const gestion = sp.get('gestion')
  const desde = sp.get('desde') || ''
  const hasta = sp.get('hasta') || ''
  const df = `
    ${desde ? `AND date(i.created_at) >= '${desde}'` : ''}
    ${hasta ? `AND date(i.created_at) <= '${hasta}'` : ''}
  `

  if (gestion) {
    // Detailed view: items + KPIs for one gestión
    const items = db.prepare(`
      SELECT
        i.id_item, i.detalle, i.id_envio, i.estado, i.estado_documentacion,
        i.eta, i.etd,
        e.gestion, e.tipo_transporte, e.nombre_agencia, e.origen, e.destino,
        e.fecha_carga, e.fecha_salida, e.fecha_llegada_puerto,
        COALESCE(dc.precio_usd, 0) as mercaderia_usd,
        COALESCE(dc.precio_sf_usd, 0) as comision_sf_usd,
        COALESCE(dc.precio_usd,0) + COALESCE(dc.precio_sf_usd,0) as total_sf_usd,
        COALESCE(
          (SELECT SUM(g.monto_usd) FROM gastos_importacion_items g WHERE g.id_item = i.id_item), 0
        ) as total_gi_usd,
        COALESCE(
          (SELECT SUM(o.total_usd) FROM otros_gastos_items o WHERE o.id_item = i.id_item), 0
        ) as total_otros_usd,
        COALESCE(
          (SELECT SUM(gp.gasto_proporcional_usd) FROM gastos_proporcionales gp WHERE gp.id_item = i.id_item), 0
        ) as total_log_usd,
        COALESCE(
          (SELECT CASE WHEN cnt.total_items > 0
              THEN (d.honorarios_usd + COALESCE(d.gastos_extras_usd,0)) / cnt.total_items
              ELSE 0 END
           FROM despacho_items di
           JOIN despachos d ON d.id_despacho = di.id_despacho
           JOIN (SELECT id_despacho, COUNT(*) as total_items FROM despacho_items GROUP BY id_despacho) cnt
             ON cnt.id_despacho = di.id_despacho
           WHERE di.id_item = i.id_item LIMIT 1
          ), 0
        ) as honorarios_usd,
        d.fecha_oficializacion, d.fecha_liberacion, d.canal
      FROM items i
      JOIN envios e ON e.id_envio = i.id_envio
      LEFT JOIN detalle_compras dc ON dc.id_item = i.id_item
      LEFT JOIN despacho_items di2 ON di2.id_item = i.id_item
      LEFT JOIN despachos d ON d.id_despacho = di2.id_despacho
      WHERE e.gestion = ? ${df}
      ORDER BY i.created_at DESC
    `).all(gestion) as any[]

    const enriched = items.map(r => ({
      ...r,
      total_operacion_usd:
        (r.total_sf_usd || 0) + (r.total_gi_usd || 0) +
        (r.total_otros_usd || 0) + (r.total_log_usd || 0) + (r.honorarios_usd || 0),
      dias_transito: (r.fecha_salida && r.fecha_llegada_puerto)
        ? Math.round(
            (new Date(r.fecha_llegada_puerto).getTime() - new Date(r.fecha_salida).getTime())
            / 86400000
          )
        : null,
      dias_aduana: (r.fecha_oficializacion && r.fecha_liberacion)
        ? Math.round(
            (new Date(r.fecha_liberacion).getTime() - new Date(r.fecha_oficializacion).getTime())
            / 86400000
          )
        : null,
      dias_ciclo: (r.fecha_carga && r.fecha_liberacion)
        ? Math.round(
            (new Date(r.fecha_liberacion).getTime() - new Date(r.fecha_carga).getTime())
            / 86400000
          )
        : null,
    }))

    // Aggregate KPIs
    const withCost = enriched.filter(r => r.total_operacion_usd > 0)
    const totalCartera = enriched.reduce((s, r) => s + r.total_operacion_usd, 0)
    const transitoDias = enriched.filter(r => r.dias_transito != null).map(r => r.dias_transito)
    const aduanaDias = enriched.filter(r => r.dias_aduana != null).map(r => r.dias_aduana)
    const cicloDias = enriched.filter(r => r.dias_ciclo != null).map(r => r.dias_ciclo)
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
    const today = new Date().toISOString().slice(0, 10)

    const kpis = {
      total_items: enriched.length,
      total_cartera_usd: totalCartera,
      total_mercaderia_usd: enriched.reduce((s, r) => s + r.mercaderia_usd, 0),
      total_sf_usd: enriched.reduce((s, r) => s + r.total_sf_usd, 0),
      total_gi_usd: enriched.reduce((s, r) => s + r.total_gi_usd, 0),
      total_log_usd: enriched.reduce((s, r) => s + r.total_log_usd, 0),
      total_honorarios_usd: enriched.reduce((s, r) => s + r.honorarios_usd, 0),
      total_otros_usd: enriched.reduce((s, r) => s + r.total_otros_usd, 0),
      promedio_por_item_usd: withCost.length ? totalCartera / withCost.length : 0,
      dias_transito_avg: avg(transitoDias),
      dias_aduana_avg: avg(aduanaDias),
      dias_ciclo_avg: avg(cicloDias),
      items_liberados: enriched.filter(r => r.fecha_liberacion).length,
      items_retrasados: enriched.filter(r =>
        r.eta && r.eta < today && !r.fecha_liberacion &&
        !['Entregado', 'Finalizado'].includes(r.estado)
      ).length,
      items_en_curso: enriched.filter(r => !r.fecha_liberacion).length,
    }

    return NextResponse.json({ kpis, items: enriched })
  }

  // Summary: all gestiones with live totals
  const gestiones = db.prepare(`
    SELECT COALESCE(e.gestion, 'Sin gestión') as gestion, COUNT(DISTINCT i.id_item) as total_items
    FROM envios e
    LEFT JOIN items i ON i.id_envio = e.id_envio
    WHERE 1=1 ${df}
    GROUP BY e.gestion
    ORDER BY e.gestion ASC
  `).all()

  return NextResponse.json(gestiones)
}
