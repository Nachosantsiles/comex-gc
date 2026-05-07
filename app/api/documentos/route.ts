export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { initializeDatabase } from '@/lib/schema'
import fs from 'fs'
import path from 'path'

initializeDatabase()

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads')

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const id_item = new URL(req.url).searchParams.get('id_item')
  const query = id_item
    ? `SELECT * FROM documentos WHERE id_item=? ORDER BY created_at DESC`
    : `SELECT * FROM documentos ORDER BY created_at DESC`
  const rows = id_item
    ? db.prepare(query).all(id_item)
    : db.prepare(query).all()

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const id_item = formData.get('id_item') as string
  const file = formData.get('file') as File

  if (!id_item || !file) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const allowed = ['pdf', 'jpg', 'jpeg', 'png']
  if (!allowed.includes(ext)) return NextResponse.json({ error: 'Tipo no permitido' }, { status: 400 })

  const itemDir = path.join(UPLOAD_DIR, id_item)
  if (!fs.existsSync(itemDir)) fs.mkdirSync(itemDir, { recursive: true })

  const timestamp = Date.now()
  const nombreArchivo = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const filePath = path.join(itemDir, nombreArchivo)

  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(filePath, buffer)

  const usuario = (session as any).user?.email || null

  db.prepare(`
    INSERT INTO documentos (id_item, nombre_original, nombre_archivo, tipo, tamanio, usuario)
    VALUES (?,?,?,?,?,?)
  `).run(id_item, file.name, nombreArchivo, file.type || ext, file.size, usuario)

  return NextResponse.json({ ok: true }, { status: 201 })
}
