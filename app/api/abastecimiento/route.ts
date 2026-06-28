export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { initializeDatabase } from '@/lib/schema'

initializeDatabase()

const STATE_KEY = 'abastecimiento'

// Devuelve el estado completo del módulo Abastecimiento (un único blob JSON).
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const row = db.prepare('SELECT value FROM app_state WHERE key=?').get(STATE_KEY) as
    | { value: string }
    | undefined
  if (!row) return NextResponse.json({ data: null })
  try {
    return NextResponse.json({ data: JSON.parse(row.value) })
  } catch {
    return NextResponse.json({ data: null })
  }
}

// Guarda el estado completo (last-write-wins sobre el blob entero).
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.text()
  try {
    JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  db.prepare(
    `INSERT INTO app_state(key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
  ).run(STATE_KEY, body)
  return NextResponse.json({ ok: true })
}
