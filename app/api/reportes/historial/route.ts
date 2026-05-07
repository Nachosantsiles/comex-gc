export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const gestion = new URL(req.url).searchParams.get('gestion')
  const query = gestion
    ? `SELECT * FROM reportes_historial WHERE gestion=? ORDER BY created_at DESC`
    : `SELECT * FROM reportes_historial ORDER BY created_at DESC`
  const rows = gestion
    ? db.prepare(query).all(gestion)
    : db.prepare(query).all()

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const {
    gestion, notas,
    total_items, total_cartera_usd, total_mercaderia_usd, total_sf_usd,
    total_gi_usd, total_log_usd, total_honorarios_usd, total_otros_usd,
    promedio_por_item_usd, dias_transito_avg, dias_aduana_avg, dias_ciclo_avg,
    items_liberados, items_retrasados, items_en_curso,
  } = body

  if (!gestion) return NextResponse.json({ error: 'Falta gestión' }, { status: 400 })

  const usuario = (session as any).user?.email || null

  db.prepare(`
    INSERT INTO reportes_historial (
      gestion, notas, total_items, total_cartera_usd, total_mercaderia_usd,
      total_sf_usd, total_gi_usd, total_log_usd, total_honorarios_usd, total_otros_usd,
      promedio_por_item_usd, dias_transito_avg, dias_aduana_avg, dias_ciclo_avg,
      items_liberados, items_retrasados, items_en_curso, usuario
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    gestion, notas || null,
    total_items || 0, total_cartera_usd || 0, total_mercaderia_usd || 0,
    total_sf_usd || 0, total_gi_usd || 0, total_log_usd || 0,
    total_honorarios_usd || 0, total_otros_usd || 0,
    promedio_por_item_usd || 0,
    dias_transito_avg ?? null, dias_aduana_avg ?? null, dias_ciclo_avg ?? null,
    items_liberados || 0, items_retrasados || 0, items_en_curso || 0,
    usuario,
  )

  return NextResponse.json({ ok: true }, { status: 201 })
}
