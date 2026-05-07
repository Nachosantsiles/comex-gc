export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { initializeDatabase, nextId } from '@/lib/schema'

initializeDatabase()

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const soloAbiertos = new URL(req.url).searchParams.get('abiertos') === '1'

  const envios = db.prepare(`
    SELECT e.*,
      COUNT(DISTINCT i.id) as total_items
    FROM envios e
    LEFT JOIN items i ON i.id_envio = e.id_envio
    ${soloAbiertos ? 'WHERE e.cerrado = 0' : ''}
    GROUP BY e.id
    ORDER BY e.created_at DESC
  `).all()

  return NextResponse.json(envios)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const id_envio = nextId('ENV', 'envio')

  db.prepare(`
    INSERT INTO envios (id_envio, tipo_transporte, modalidad, nombre_agencia, ref_contenedor,
      origen, destino, incoterm, gestion, nombre_empresa, bl_awb_crt, bl_tipo,
      fecha_carga, etd, fecha_salida, eta, fecha_llegada_puerto, fecha_llegada_lr,
      fecha_desconsolidacion, observaciones, cerrado)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id_envio, body.tipo_transporte, body.modalidad, body.nombre_agencia, body.ref_contenedor,
    body.origen, body.destino, body.incoterm, body.gestion, body.nombre_empresa,
    body.bl_awb_crt, body.bl_tipo, body.fecha_carga, body.etd, body.fecha_salida,
    body.eta, body.fecha_llegada_puerto, body.fecha_llegada_lr,
    body.fecha_desconsolidacion, body.observaciones, body.cerrado ? 1 : 0
  )

  return NextResponse.json({ id_envio }, { status: 201 })
}
