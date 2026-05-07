export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { initializeDatabase } from '@/lib/schema'

initializeDatabase()

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const in7   = new Date(Date.now() + 7  * 86400000).toISOString().slice(0, 10)
  const in3   = new Date(Date.now() + 3  * 86400000).toISOString().slice(0, 10)

  // Items retrasados: ETA vencida sin liberar
  const retrasados = db.prepare(`
    SELECT i.id_item, i.detalle, i.eta, i.estado, e.id_envio
    FROM items i
    JOIN envios e ON e.id_envio = i.id_envio
    LEFT JOIN despacho_items di ON di.id_item = i.id_item
    LEFT JOIN despachos d ON d.id_despacho = di.id_despacho
    WHERE i.eta IS NOT NULL AND i.eta != ''
      AND date(i.eta) < date('now')
      AND (d.fecha_liberacion IS NULL OR d.fecha_liberacion = '')
      AND i.estado NOT IN ('Entregado','Finalizado')
    ORDER BY i.eta ASC
    LIMIT 20
  `).all() as any[]

  // ETAs próximos 3 días (urgentes)
  const etasUrgentes = db.prepare(`
    SELECT i.id_item, i.detalle, i.eta, i.estado, e.id_envio
    FROM items i
    JOIN envios e ON e.id_envio = i.id_envio
    LEFT JOIN despacho_items di ON di.id_item = i.id_item
    LEFT JOIN despachos d ON d.id_despacho = di.id_despacho
    WHERE i.eta IS NOT NULL AND i.eta != ''
      AND date(i.eta) BETWEEN date('now') AND date('now', '+3 days')
      AND (d.fecha_liberacion IS NULL OR d.fecha_liberacion = '')
    ORDER BY i.eta ASC
    LIMIT 20
  `).all() as any[]

  // ETAs próximos 7 días
  const etasProximos = db.prepare(`
    SELECT i.id_item, i.detalle, i.eta, i.estado, e.id_envio
    FROM items i
    JOIN envios e ON e.id_envio = i.id_envio
    LEFT JOIN despacho_items di ON di.id_item = i.id_item
    LEFT JOIN despachos d ON d.id_despacho = di.id_despacho
    WHERE i.eta IS NOT NULL AND i.eta != ''
      AND date(i.eta) > date('now', '+3 days')
      AND date(i.eta) <= date('now', '+7 days')
      AND (d.fecha_liberacion IS NULL OR d.fecha_liberacion = '')
    ORDER BY i.eta ASC
    LIMIT 20
  `).all() as any[]

  // Documentos observados
  const docsObservados = db.prepare(`
    SELECT i.id_item, i.detalle, i.estado_documentacion, e.id_envio
    FROM items i
    JOIN envios e ON e.id_envio = i.id_envio
    WHERE i.estado_documentacion IN ('Observado','En Revisión')
    ORDER BY i.created_at DESC
    LIMIT 20
  `).all() as any[]

  // Canal rojo
  const canalRojo = db.prepare(`
    SELECT d.id_despacho, d.canal, i.id_item, i.detalle
    FROM despachos d
    JOIN despacho_items di ON di.id_despacho = d.id_despacho
    JOIN items i ON i.id_item = di.id_item
    WHERE d.canal = 'Rojo'
      AND (d.fecha_liberacion IS NULL OR d.fecha_liberacion = '')
    ORDER BY d.created_at DESC
    LIMIT 20
  `).all() as any[]

  // Envíos sin ETA cargada (en tránsito)
  const sinEta = db.prepare(`
    SELECT i.id_item, i.detalle, i.estado, e.id_envio
    FROM items i
    JOIN envios e ON e.id_envio = i.id_envio
    WHERE (i.eta IS NULL OR i.eta = '')
      AND i.estado IN ('Puerto Origen','En tránsito','Puerto Destino')
    ORDER BY i.created_at DESC
    LIMIT 10
  `).all() as any[]

  const total = retrasados.length + etasUrgentes.length + docsObservados.length + canalRojo.length

  return NextResponse.json({
    total,
    retrasados,
    etas_urgentes: etasUrgentes,
    etas_proximos: etasProximos,
    docs_observados: docsObservados,
    canal_rojo: canalRojo,
    sin_eta: sinEta,
  })
}
