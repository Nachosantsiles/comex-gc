export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const envio = db.prepare('SELECT * FROM envios WHERE id_envio=?').get(id)
  if (!envio) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(envio)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const current = db.prepare('SELECT etd, eta FROM envios WHERE id_envio=?').get(id) as any

  db.prepare(`
    UPDATE envios SET tipo_transporte=?, modalidad=?, nombre_agencia=?, ref_contenedor=?,
      origen=?, destino=?, incoterm=?, gestion=?, nombre_empresa=?, bl_awb_crt=?, bl_tipo=?,
      fecha_carga=?, etd=?, fecha_salida=?, eta=?, fecha_llegada_puerto=?, fecha_llegada_lr=?,
      fecha_desconsolidacion=?, observaciones=?, cerrado=?, updated_at=datetime('now')
    WHERE id_envio=?
  `).run(
    body.tipo_transporte, body.modalidad, body.nombre_agencia, body.ref_contenedor,
    body.origen, body.destino, body.incoterm, body.gestion, body.nombre_empresa,
    body.bl_awb_crt, body.bl_tipo, body.fecha_carga, body.etd, body.fecha_salida,
    body.eta, body.fecha_llegada_puerto, body.fecha_llegada_lr,
    body.fecha_desconsolidacion, body.observaciones, body.cerrado ? 1 : 0, id
  )

  // Sync ETD/ETA to items belonging to this envío
  db.prepare(`UPDATE items SET etd=?, eta=?, updated_at=datetime('now') WHERE id_envio=?`)
    .run(body.etd ?? null, body.eta ?? null, id)

  // Register history for ETD/ETA changes
  if (current) {
    const motivo = body.motivo_cambio_fecha || null
    const usuario = (session as any).user?.email || null
    if (current.etd !== body.etd) {
      db.prepare(`INSERT INTO historial_fechas(id_envio, campo, valor_anterior, valor_nuevo, motivo, usuario) VALUES (?,?,?,?,?,?)`)
        .run(id, 'ETD', current.etd, body.etd, motivo, usuario)
    }
    if (current.eta !== body.eta) {
      db.prepare(`INSERT INTO historial_fechas(id_envio, campo, valor_anterior, valor_nuevo, motivo, usuario) VALUES (?,?,?,?,?,?)`)
        .run(id, 'ETA', current.eta, body.eta, motivo, usuario)
    }
  }

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  if (body.estado !== undefined) {
    const current = db.prepare('SELECT estado FROM envios WHERE id_envio=?').get(id) as any
    db.prepare(`UPDATE envios SET estado=?, updated_at=datetime('now') WHERE id_envio=?`).run(body.estado, id)
    db.prepare(`
      INSERT INTO historial_fechas(id_envio, campo, valor_anterior, valor_nuevo, motivo, usuario)
      VALUES (?,?,?,?,?,?)
    `).run(id, 'Estado', current?.estado ?? 'Sin Iniciar', body.estado, body.motivo || null, (session as any).user?.email || null)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  db.prepare('DELETE FROM envios WHERE id_envio=?').run(id)
  return NextResponse.json({ ok: true })
}
