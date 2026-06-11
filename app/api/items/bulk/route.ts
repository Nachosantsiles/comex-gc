export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'

/** PATCH /api/items/bulk
 *  Body: { ids: string[], estado?: string, estado_documentacion?: string }
 *  Updates all supplied item IDs with the given fields.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const ids: string[] = body.ids ?? []
  if (!ids.length) return NextResponse.json({ error: 'No se enviaron IDs' }, { status: 400 })

  const sets: string[] = []
  const args: any[] = []

  if (body.estado !== undefined) { sets.push('estado=?'); args.push(body.estado) }
  if (body.estado_documentacion !== undefined) { sets.push('estado_documentacion=?'); args.push(body.estado_documentacion) }

  if (!sets.length) return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 })

  sets.push("updated_at=datetime('now')")
  const placeholders = ids.map(() => '?').join(',')
  const sql = `UPDATE items SET ${sets.join(', ')} WHERE id_item IN (${placeholders})`

  const result = db.prepare(sql).run(...args, ...ids)
  return NextResponse.json({ updated: result.changes })
}
