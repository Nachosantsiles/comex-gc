export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const gasto = db.prepare('SELECT * FROM gastos_logisticos WHERE id_gasto=?').get(id)
  if (!gasto) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const recargos = db.prepare('SELECT * FROM recargos_logisticos WHERE id_gasto=?').all(id)
  const proporcionales = db.prepare(`
    SELECT gp.*, i.detalle FROM gastos_proporcionales gp
    LEFT JOIN items i ON i.id_item = gp.id_item
    WHERE gp.id_gasto=?
  `).all(id)
  return NextResponse.json({ ...gasto, recargos, proporcionales })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const criterio = body.criterio_distribucion ?? 'volumen'

  const total = (body.gastos_origen_usd ?? 0) + (body.flete_internacional_usd ?? 0) +
    (body.gastos_destino_usd ?? 0) + (body.flete_interno_usd ?? 0) +
    (body.recargos?.reduce((a: number, r: any) => a + (r.recargo_usd ?? 0), 0) ?? 0)

  db.prepare(`
    UPDATE gastos_logisticos SET id_envio=?, nombre_agencia=?, id_tipo_contenedor=?,
      peso_total_kg=?, volumen_total_m3=?, gastos_origen_usd=?, flete_internacional_usd=?,
      gastos_destino_usd=?, nombre_terminal=?, flete_interno_usd=?,
      criterio_distribucion=?, total_usd=?, updated_at=datetime('now')
    WHERE id_gasto=?
  `).run(
    body.id_envio, body.nombre_agencia, body.id_tipo_contenedor,
    body.peso_total_kg, body.volumen_total_m3, body.gastos_origen_usd,
    body.flete_internacional_usd, body.gastos_destino_usd, body.nombre_terminal,
    body.flete_interno_usd, criterio, total, id
  )

  db.prepare('DELETE FROM recargos_logisticos WHERE id_gasto=?').run(id)
  if (body.recargos?.length) {
    const ins = db.prepare('INSERT INTO recargos_logisticos(id_gasto, detalle, recargo_usd) VALUES (?,?,?)')
    body.recargos.forEach((r: any) => ins.run(id, r.detalle, r.recargo_usd))
  }

  db.prepare('DELETE FROM gastos_proporcionales WHERE id_gasto=?').run(id)
  if (body.items_proporcionales?.length) {
    const ins = db.prepare(`
      INSERT INTO gastos_proporcionales(id_gasto, id_item, volumen_item_m3, peso_item_kg, gasto_proporcional_usd)
      VALUES (?,?,?,?,?)
    `)
    const totalVol = body.items_proporcionales.reduce((a: number, it: any) => a + (it.volumen_item_m3 ?? 0), 0)
    const totalPeso = body.items_proporcionales.reduce((a: number, it: any) => a + (it.peso_item_kg ?? 0), 0)

    body.items_proporcionales.forEach((it: any) => {
      let prop = 0
      if (criterio === 'peso') {
        prop = totalPeso > 0 ? ((it.peso_item_kg ?? 0) / totalPeso) * total : 0
      } else {
        prop = totalVol > 0 ? ((it.volumen_item_m3 ?? 0) / totalVol) * total : 0
      }
      ins.run(id, it.id_item, it.volumen_item_m3, it.peso_item_kg, prop)
    })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  db.prepare('DELETE FROM recargos_logisticos WHERE id_gasto=?').run(id)
  db.prepare('DELETE FROM gastos_proporcionales WHERE id_gasto=?').run(id)
  db.prepare('DELETE FROM gastos_logisticos WHERE id_gasto=?').run(id)
  return NextResponse.json({ ok: true })
}
