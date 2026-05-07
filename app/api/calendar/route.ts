export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { initializeDatabase } from '@/lib/schema'

initializeDatabase()

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year  = parseInt(searchParams.get('year')  || String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))

  const pad   = (n: number) => String(n).padStart(2, '0')
  const start = `${year}-${pad(month)}-01`
  const end   = `${year}-${pad(month)}-31`

  // ETAs de ítems
  const etas = db.prepare(`
    SELECT eta as date, COUNT(*) as count, 'eta' as type,
           GROUP_CONCAT(COALESCE(detalle, id_item), ' | ') as labels
    FROM items
    WHERE eta >= ? AND eta <= ? AND eta IS NOT NULL AND eta != ''
    GROUP BY eta
  `).all(start, end)

  // ETDs de envíos
  const etds = db.prepare(`
    SELECT etd as date, COUNT(*) as count, 'etd' as type,
           GROUP_CONCAT(id_envio, ' | ') as labels
    FROM envios
    WHERE etd >= ? AND etd <= ? AND etd IS NOT NULL AND etd != ''
    GROUP BY etd
  `).all(start, end)

  // Fecha salida de envíos
  const salidas = db.prepare(`
    SELECT fecha_salida as date, COUNT(*) as count, 'salida' as type,
           GROUP_CONCAT(id_envio, ' | ') as labels
    FROM envios
    WHERE fecha_salida >= ? AND fecha_salida <= ? AND fecha_salida IS NOT NULL AND fecha_salida != ''
    GROUP BY fecha_salida
  `).all(start, end)

  // Liberaciones de despachos
  const liberaciones = db.prepare(`
    SELECT fecha_liberacion as date, COUNT(*) as count, 'liberacion' as type,
           GROUP_CONCAT(id_despacho, ' | ') as labels
    FROM despachos
    WHERE fecha_liberacion >= ? AND fecha_liberacion <= ? AND fecha_liberacion IS NOT NULL AND fecha_liberacion != ''
    GROUP BY fecha_liberacion
  `).all(start, end)

  // Oficializaciones
  const oficializaciones = db.prepare(`
    SELECT fecha_oficializacion as date, COUNT(*) as count, 'oficializacion' as type,
           GROUP_CONCAT(id_despacho, ' | ') as labels
    FROM despachos
    WHERE fecha_oficializacion >= ? AND fecha_oficializacion <= ? AND fecha_oficializacion IS NOT NULL AND fecha_oficializacion != ''
    GROUP BY fecha_oficializacion
  `).all(start, end)

  // Group all events by date
  const map: Record<string, any[]> = {}
  for (const ev of [...etas, ...etds, ...salidas, ...liberaciones, ...oficializaciones] as any[]) {
    const d = ev.date?.slice(0, 10)
    if (!d) continue
    if (!map[d]) map[d] = []
    map[d].push({ type: ev.type, count: ev.count, labels: ev.labels })
  }

  return NextResponse.json(map)
}
