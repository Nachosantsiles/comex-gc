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
  const df = `
    ${desde ? `AND date(i.created_at) >= '${desde}'` : ''}
    ${hasta ? `AND date(i.created_at) <= '${hasta}'` : ''}
  `
  const edf = `
    ${desde ? `AND date(e.created_at) >= '${desde}'` : ''}
    ${hasta ? `AND date(e.created_at) <= '${hasta}'` : ''}
  `

  // ── Financial KPIs ──────────────────────────────────────────────────────────
  const financiero = db.prepare(`
    SELECT
      COUNT(i.id_item) as total_items,
      SUM(COALESCE(dc.precio_usd, 0)) as total_mercaderia,
      SUM(COALESCE(dc.precio_sf_usd, 0)) as total_comision_sf,
      SUM(COALESCE(dc.precio_usd,0) + COALESCE(dc.precio_sf_usd,0)) as total_sf,
      SUM(COALESCE(
        (SELECT SUM(g.monto_usd) FROM gastos_importacion_items g WHERE g.id_item = i.id_item), 0
      )) as total_gi,
      SUM(COALESCE(
        (SELECT SUM(o.total_usd) FROM otros_gastos_items o WHERE o.id_item = i.id_item), 0
      )) as total_otros,
      SUM(COALESCE(
        (SELECT SUM(gp.gasto_proporcional_usd) FROM gastos_proporcionales gp WHERE gp.id_item = i.id_item), 0
      )) as total_log,
      SUM(COALESCE(
        (SELECT
          CASE WHEN cnt.total_items > 0
            THEN (d.honorarios_usd + COALESCE(d.gastos_extras_usd,0)) / cnt.total_items
            ELSE 0
          END
         FROM despacho_items di
         JOIN despachos d ON d.id_despacho = di.id_despacho
         JOIN (SELECT id_despacho, COUNT(*) as total_items FROM despacho_items GROUP BY id_despacho) cnt
           ON cnt.id_despacho = di.id_despacho
         WHERE di.id_item = i.id_item LIMIT 1
        ), 0
      )) as total_honorarios
    FROM items i
    LEFT JOIN detalle_compras dc ON dc.id_item = i.id_item
    WHERE 1=1 ${df}
  `).get() as any

  const totalCartera =
    (financiero.total_sf || 0) +
    (financiero.total_gi || 0) +
    (financiero.total_otros || 0) +
    (financiero.total_log || 0) +
    (financiero.total_honorarios || 0)

  const itemsConCosto = (db.prepare(`
    SELECT COUNT(*) as n FROM items i
    LEFT JOIN detalle_compras dc ON dc.id_item = i.id_item
    WHERE COALESCE(dc.precio_usd, 0) > 0 ${df}
  `).get() as any).n

  const promedioPorItem = itemsConCosto > 0 ? totalCartera / itemsConCosto : 0

  // ── Time KPIs ────────────────────────────────────────────────────────────────
  const transitoAvg = (db.prepare(`
    SELECT AVG(CAST(julianday(fecha_llegada_puerto) - julianday(fecha_salida) AS REAL)) as dias
    FROM envios
    WHERE fecha_salida IS NOT NULL AND fecha_salida != ''
      AND fecha_llegada_puerto IS NOT NULL AND fecha_llegada_puerto != ''
  `).get() as any).dias

  const aduanaAvg = (db.prepare(`
    SELECT AVG(CAST(julianday(fecha_liberacion) - julianday(fecha_oficializacion) AS REAL)) as dias
    FROM despachos
    WHERE fecha_oficializacion IS NOT NULL AND fecha_oficializacion != ''
      AND fecha_liberacion IS NOT NULL AND fecha_liberacion != ''
  `).get() as any).dias

  // Full cycle: carga → liberación (joining envío → despacho_items → despachos)
  const cicloAvg = (db.prepare(`
    SELECT AVG(CAST(julianday(d.fecha_liberacion) - julianday(e.fecha_carga) AS REAL)) as dias
    FROM envios e
    JOIN items i ON i.id_envio = e.id_envio
    JOIN despacho_items di ON di.id_item = i.id_item
    JOIN despachos d ON d.id_despacho = di.id_despacho
    WHERE e.fecha_carga IS NOT NULL AND e.fecha_carga != ''
      AND d.fecha_liberacion IS NOT NULL AND d.fecha_liberacion != ''
      ${df}
  `).get() as any).dias

  // Items with past ETA that are not yet liberated
  const retrasados = (db.prepare(`
    SELECT COUNT(*) as n FROM items i
    LEFT JOIN despacho_items di ON di.id_item = i.id_item
    LEFT JOIN despachos d ON d.id_despacho = di.id_despacho
    WHERE i.eta IS NOT NULL AND i.eta != ''
      AND date(i.eta) < date('now')
      AND (d.fecha_liberacion IS NULL OR d.fecha_liberacion = '')
      AND i.estado NOT IN ('Entregado', 'Finalizado')
      ${df}
  `).get() as any).n

  // Despachos liberated this month
  const liberadosMes = (db.prepare(`
    SELECT COUNT(*) as n FROM despachos
    WHERE fecha_liberacion IS NOT NULL AND fecha_liberacion != ''
      AND strftime('%Y-%m', fecha_liberacion) = strftime('%Y-%m', 'now')
  `).get() as any).n

  // Despachos liberated last month
  const liberadosMesAnterior = (db.prepare(`
    SELECT COUNT(*) as n FROM despachos
    WHERE fecha_liberacion IS NOT NULL AND fecha_liberacion != ''
      AND strftime('%Y-%m', fecha_liberacion) = strftime('%Y-%m', date('now', '-1 month'))
  `).get() as any).n

  // ETA distribution (next 30 days by week bucket)
  const proximosEta = db.prepare(`
    SELECT
      CASE
        WHEN date(eta) <= date('now', '+7 days')  THEN '0-7 días'
        WHEN date(eta) <= date('now', '+14 days') THEN '8-14 días'
        WHEN date(eta) <= date('now', '+21 days') THEN '15-21 días'
        ELSE '22-30 días'
      END as bucket,
      COUNT(*) as total
    FROM items
    WHERE eta IS NOT NULL AND eta != ''
      AND date(eta) BETWEEN date('now') AND date('now', '+30 days')
    GROUP BY bucket
    ORDER BY MIN(date(eta))
  `).all()

  // Monthly totals (last 6 months) for financial trend
  const tendenciaMensual = db.prepare(`
    SELECT
      strftime('%Y-%m', i.created_at) as mes,
      COUNT(*) as items,
      SUM(COALESCE(dc.precio_usd,0) + COALESCE(dc.precio_sf_usd,0)) as total_sf,
      SUM(COALESCE(
        (SELECT SUM(g.monto_usd) FROM gastos_importacion_items g WHERE g.id_item = i.id_item), 0
      )) as total_gi
    FROM items i
    LEFT JOIN detalle_compras dc ON dc.id_item = i.id_item
    WHERE i.created_at >= date('now', '-6 months')
    GROUP BY mes
    ORDER BY mes ASC
  `).all()

  // ── Per-item KPIs ────────────────────────────────────────────────────────────
  const porItem = db.prepare(`
    SELECT
      i.id_item, i.detalle, i.id_envio, i.estado, i.estado_documentacion,
      COALESCE(i.eta, e.eta) as eta,
      -- Financial
      COALESCE(dc.precio_usd, 0) as mercaderia_usd,
      COALESCE(dc.precio_sf_usd, 0) as comision_sf_usd,
      COALESCE((SELECT SUM(g.monto_usd) FROM gastos_importacion_items g WHERE g.id_item = i.id_item), 0) as gi_usd,
      COALESCE((SELECT SUM(o.total_usd) FROM otros_gastos_items o WHERE o.id_item = i.id_item), 0) as otros_usd,
      COALESCE((SELECT SUM(gp.gasto_proporcional_usd) FROM gastos_proporcionales gp WHERE gp.id_item = i.id_item), 0) as log_usd,
      COALESCE((
        SELECT CASE WHEN cnt.total_items > 0
          THEN (d.honorarios_usd + COALESCE(d.gastos_extras_usd,0)) / cnt.total_items ELSE 0 END
        FROM despacho_items di
        JOIN despachos d ON d.id_despacho = di.id_despacho
        JOIN (SELECT id_despacho, COUNT(*) as total_items FROM despacho_items GROUP BY id_despacho) cnt
          ON cnt.id_despacho = di.id_despacho
        WHERE di.id_item = i.id_item LIMIT 1
      ), 0) as honorarios_usd,
      -- Time
      ROUND(CAST(julianday(NULLIF(e.fecha_llegada_puerto,'')) - julianday(NULLIF(e.fecha_salida,'')) AS REAL)) as dias_transito,
      ROUND(CAST(julianday(NULLIF(
        (SELECT d2.fecha_liberacion FROM despacho_items di2 JOIN despachos d2 ON d2.id_despacho=di2.id_despacho WHERE di2.id_item=i.id_item LIMIT 1),''
      )) - julianday(NULLIF(
        (SELECT d2.fecha_oficializacion FROM despacho_items di2 JOIN despachos d2 ON d2.id_despacho=di2.id_despacho WHERE di2.id_item=i.id_item LIMIT 1),''
      )) AS REAL)) as dias_aduana,
      ROUND(CAST(julianday(NULLIF(
        (SELECT d2.fecha_liberacion FROM despacho_items di2 JOIN despachos d2 ON d2.id_despacho=di2.id_despacho WHERE di2.id_item=i.id_item LIMIT 1),''
      )) - julianday(NULLIF(e.fecha_carga,'')) AS REAL)) as dias_ciclo
    FROM items i
    LEFT JOIN detalle_compras dc ON dc.id_item = i.id_item
    LEFT JOIN envios e ON e.id_envio = i.id_envio
    WHERE 1=1 ${df}
    ORDER BY i.created_at DESC
  `).all() as any[]

  const porItemConTotal = porItem.map(r => ({
    ...r,
    total_usd: (r.mercaderia_usd + r.comision_sf_usd + r.gi_usd + r.otros_usd + r.log_usd + r.honorarios_usd),
  }))

  // ── Per-envío KPIs ───────────────────────────────────────────────────────────
  const porEnvio = db.prepare(`
    SELECT
      e.id_envio, e.origen, e.destino, e.eta, e.etd, e.tipo_transporte,
      COUNT(i.id_item) as total_items,
      -- Financial
      COALESCE(SUM(COALESCE(dc.precio_usd,0) + COALESCE(dc.precio_sf_usd,0)), 0) as total_sf_usd,
      COALESCE(SUM(COALESCE(
        (SELECT SUM(g.monto_usd) FROM gastos_importacion_items g WHERE g.id_item = i.id_item), 0
      )), 0) as total_gi_usd,
      COALESCE(SUM(COALESCE(
        (SELECT SUM(gp.gasto_proporcional_usd) FROM gastos_proporcionales gp WHERE gp.id_item = i.id_item), 0
      )), 0) as total_log_usd,
      -- Time
      ROUND(CAST(julianday(NULLIF(e.fecha_llegada_puerto,'')) - julianday(NULLIF(e.fecha_salida,'')) AS REAL)) as dias_transito,
      ROUND(AVG(CAST(julianday(NULLIF(d.fecha_liberacion,'')) - julianday(NULLIF(d.fecha_oficializacion,'')) AS REAL))) as dias_aduana_avg,
      ROUND(CAST(julianday(NULLIF(MAX(d.fecha_liberacion),'')) - julianday(NULLIF(e.fecha_carga,'')) AS REAL)) as dias_ciclo
    FROM envios e
    LEFT JOIN items i ON i.id_envio = e.id_envio
    LEFT JOIN detalle_compras dc ON dc.id_item = i.id_item
    LEFT JOIN despacho_items di ON di.id_item = i.id_item
    LEFT JOIN despachos d ON d.id_despacho = di.id_despacho
    WHERE e.cerrado = 0 ${edf}
    GROUP BY e.id_envio
    ORDER BY e.created_at DESC
  `).all() as any[]

  const porEnvioConTotal = porEnvio.map(r => ({
    ...r,
    total_usd: (r.total_sf_usd + r.total_gi_usd + r.total_log_usd),
  }))

  return NextResponse.json({
    financiero: {
      total_cartera: totalCartera,
      total_mercaderia: financiero.total_mercaderia || 0,
      total_comision_sf: financiero.total_comision_sf || 0,
      total_sf: financiero.total_sf || 0,
      total_gi: financiero.total_gi || 0,
      total_otros: financiero.total_otros || 0,
      total_log: financiero.total_log || 0,
      total_honorarios: financiero.total_honorarios || 0,
      promedio_por_item: promedioPorItem,
      items_con_costo: itemsConCosto,
      items_sin_costo: (financiero.total_items || 0) - itemsConCosto,
    },
    tiempos: {
      transito_dias_avg: transitoAvg ? Math.round(transitoAvg) : null,
      aduana_dias_avg: aduanaAvg ? Math.round(aduanaAvg) : null,
      ciclo_dias_avg: cicloAvg ? Math.round(cicloAvg) : null,
      items_retrasados: retrasados,
      liberados_mes: liberadosMes,
      liberados_mes_anterior: liberadosMesAnterior,
      proximos_eta: proximosEta,
    },
    tendencia_mensual: tendenciaMensual,
    por_item: porItemConTotal,
    por_envio: porEnvioConTotal,
  })
}
