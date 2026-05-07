export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads')

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const doc = db.prepare('SELECT * FROM documentos WHERE id=?').get(id) as any
  if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const filePath = path.join(UPLOAD_DIR, doc.id_item, doc.nombre_archivo)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  db.prepare('DELETE FROM documentos WHERE id=?').run(id)
  return NextResponse.json({ ok: true })
}
