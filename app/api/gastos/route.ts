export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { nextId } from '@/lib/schema'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const gastos = db.prepare(`
    SELECT gl.*, e.ref_contenedor, e.tipo_transporte,
      ct.peso_max_kg, ct.volumen_max_m3,
      COALESCE(SUM(r.recargo_usd),0) as total_recargos
    FROM gastos_logisticos gl
    LEFT JOIN envios e ON e.id_envio = gl.id_envio
    LEFT JOIN container_types ct ON ct.id = gl.id_tipo_contenedor
    LEFT JOIN recargos_logisticos r ON r.id_gasto = gl.id_gasto
    GROUP BY gl.id
    ORDER BY gl.created_at DESC
  `).all()

  return NextResponse.json(gastos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const id_gasto = nextId('GL', 'gasto')
  const criterio = body.criterio_distribucion ?? 'volumen'

  const moneda = body.moneda ?? 'USD'
  const tipoCambio = moneda === 'USD' ? 1 : (body.tipo_cambio ?? 1)

  // Sum amounts as entered (in selected currency), then convert to USD
  const totalMoneda = (body.gastos_origen_usd ?? 0) + (body.flete_internacional_usd ?? 0) +
    (body.gastos_destino_usd ?? 0) + (body.flete_interno_usd ?? 0) +
    (body.recargos?.reduce((a: number, r: any) => a + (r.recargo_usd ?? 0), 0) ?? 0)
  // total_usd always stored in USD (divide by tipo_cambio when moneda != USD)
  const total = tipoCambio > 0 ? totalMoneda / tipoCambio : totalMoneda

  db.prepare(`
    INSERT INTO gastos_logisticos (id_gasto, id_envio, nombre_agencia, id_tipo_contenedor,
      peso_total_kg, volumen_total_m3, gastos_origen_usd, flete_internacional_usd,
      gastos_destino_usd, nombre_terminal, flete_interno_usd, criterio_distribucion, total_usd,
      moneda, tipo_cambio)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id_gasto, body.id_envio, body.nombre_agencia, body.id_tipo_contenedor,
    body.peso_total_kg, body.volumen_total_m3, body.gastos_origen_usd,
    body.flete_internacional_usd, body.gastos_destino_usd, body.nombre_terminal,
    body.flete_interno_usd, criterio, total, moneda, tipoCambio
  )

  if (body.recargos?.length) {
    const ins = db.prepare('INSERT INTO recargos_logisticos(id_gasto, detalle, recargo_usd) VALUES (?,?,?)')
    body.recargos.forEach((r: any) => ins.run(id_gasto, r.detalle, r.recargo_usd))
  }

  if (body.items_proporcionales?.length) {
    const ins = db.prepare(`
      INSERT OR REPLACE INTO gastos_proporcionales(id_gasto, id_item, volumen_item_m3, peso_item_kg, gasto_proporcional_usd)
      VALUES (?,?,?,?,?)
    `)
    const totalVol = body.items_proporcionales.reduce((a: number, it: any) => a + (it.volumen_item_m3 ?? 0), 0)
    const totalPeso = body.items_proporcionales.reduce((a: number, it: any) => a + (it.peso_item_kg ?? 0), 0)

    body.items_proporcionales.forEach((it: any) => {
      let propMoneda = 0
      if (criterio === 'peso') {
        propMoneda = totalPeso > 0 ? ((it.peso_item_kg ?? 0) / totalPeso) * totalMoneda : 0
      } else {
        propMoneda = totalVol > 0 ? ((it.volumen_item_m3 ?? 0) / totalVol) * totalMoneda : 0
      }
      // Always store proportional in USD
      const propUsd = tipoCambio > 0 ? propMoneda / tipoCambio : propMoneda
      ins.run(id_gasto, it.id_item, it.volumen_item_m3, it.peso_item_kg, propUsd)
    })
  }

  return NextResponse.json({ id_gasto }, { status: 201 })
}
