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
  const envioDateFilter = `
    ${desde ? `AND date(e.created_at) >= '${desde}'` : ''}
    ${hasta ? `AND date(e.created_at) <= '${hasta}'` : ''}
  `

  const totalEnvios = (db.prepare(`SELECT COUNT(*) as n FROM envios e WHERE 1=1 ${envioDateFilter}`).get() as any).n
  const totalItems = (db.prepare(`SELECT COUNT(*) as n FROM items i WHERE 1=1 ${dateFilter}`).get() as any).n
  const totalDespachos = (db.prepare('SELECT COUNT(*) as n FROM despachos').get() as any).n

  const alertas = {
    docs_observados: (db.prepare(`SELECT COUNT(*) as n FROM items i WHERE estado_documentacion='Observado' ${dateFilter}`).get() as any).n,
    despachos_observados: (db.prepare("SELECT COUNT(*) as n FROM despachos WHERE estado='Observado'").get() as any).n,
    canal_rojo: (db.prepare("SELECT COUNT(*) as n FROM despachos WHERE canal='Rojo'").get() as any).n,
    en_transito: (db.prepare(`SELECT COUNT(*) as n FROM items i WHERE estado='En tránsito' ${dateFilter}`).get() as any).n,
    proximos_eta: (db.prepare(`
      SELECT COUNT(*) as n FROM envios e
      WHERE eta IS NOT NULL AND eta != ''
        AND date(eta) BETWEEN date('now') AND date('now', '+7 days')
        ${envioDateFilter}
    `).get() as any).n,
  }

  const estadosEnvios = db.prepare(`
    SELECT i.estado, COUNT(*) as total FROM items i WHERE 1=1 ${dateFilter}
    GROUP BY i.estado ORDER BY total DESC
  `).all()

  const estadosDocs = db.prepare(`
    SELECT i.estado_documentacion as estado, COUNT(*) as total FROM items i
    WHERE 1=1 ${dateFilter}
    GROUP BY i.estado_documentacion ORDER BY total DESC
  `).all()

  const ultimosEnvios = db.prepare(`
    SELECT e.id_envio, e.tipo_transporte, e.origen, e.destino, e.eta,
      COUNT(i.id) as items
    FROM envios e
    LEFT JOIN items i ON i.id_envio = e.id_envio
    WHERE 1=1 ${envioDateFilter}
    GROUP BY e.id
    ORDER BY e.created_at DESC LIMIT 5
  `).all()

  return NextResponse.json({
    kpis: { totalEnvios, totalItems, totalDespachos },
    alertas,
    estadosEnvios,
    estadosDocs,
    ultimosEnvios,
  })
}
