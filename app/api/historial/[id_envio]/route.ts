export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id_envio: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id_envio } = await params
  const rows = db.prepare(
    `SELECT * FROM historial_fechas WHERE id_envio=? ORDER BY created_at DESC`
  ).all(id_envio)
  return NextResponse.json(rows)
}
