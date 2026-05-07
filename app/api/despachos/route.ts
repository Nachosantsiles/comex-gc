export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const despachos = db.prepare(`
    SELECT d.*,
      GROUP_CONCAT(di.id_item, ', ') as items_str,
      COUNT(di.id) as total_items
    FROM despachos d
    LEFT JOIN despacho_items di ON di.id_despacho = d.id_despacho
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `).all()

  return NextResponse.json(despachos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()

  db.prepare(`
    INSERT INTO despachos (id_despacho, id_envio, turno_retiro, estado, canal,
      motivo_demora, fecha_oficializacion, fecha_liberacion, fecha_desconsolidacion,
      nombre_despachante, honorarios_pesos, tipo_cambio, honorarios_usd, gastos_extras_usd)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    body.id_despacho, body.id_envio, body.turno_retiro, body.estado ?? 'En curso',
    body.canal, body.motivo_demora, body.fecha_oficializacion,
    body.fecha_liberacion, body.fecha_desconsolidacion, body.nombre_despachante,
    body.honorarios_pesos, body.tipo_cambio, body.honorarios_usd, body.gastos_extras_usd
  )

  if (body.items?.length) {
    const ins = db.prepare('INSERT OR IGNORE INTO despacho_items(id_despacho, id_item) VALUES (?,?)')
    body.items.forEach((id_item: string) => ins.run(body.id_despacho, id_item))
  }

  return NextResponse.json({ id_despacho: body.id_despacho }, { status: 201 })
}
