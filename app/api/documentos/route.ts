export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { initializeDatabase } from '@/lib/schema'
import { r2Enabled, uploadToR2 } from '@/lib/r2'
import fs from 'fs'
import path from 'path'

initializeDatabase()

// Ensure storage column exists (migration for existing installs)
try {
  db.prepare(`ALTER TABLE documentos ADD COLUMN storage TEXT NOT NULL DEFAULT 'local'`).run()
} catch {}

// UPLOAD_DIR env var allows Railway Volume or any custom path
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads')

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
  const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'xlsx', 'xls', 'doc', 'docx']
  if (!allowed.includes(ext)) return NextResponse.json({ error: 'Tipo no permitido' }, { status: 400 })

  const timestamp = Date.now()
  const safeName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const usuario = (session as any).user?.email || null

  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  const contentType = mimeMap[ext] ?? 'application/octet-stream'

  if (r2Enabled) {
    // ── Cloudflare R2 ──────────────────────────────────────────────────────
    const r2Key = `documentos/${id_item}/${safeName}`
    await uploadToR2(r2Key, buffer, contentType)
    db.prepare(`
      INSERT INTO documentos (id_item, nombre_original, nombre_archivo, tipo, tamanio, usuario, storage)
      VALUES (?,?,?,?,?,?,'r2')
    `).run(id_item, file.name, r2Key, contentType, file.size, usuario)
  } else {
    // ── Local filesystem ───────────────────────────────────────────────────
    const itemDir = path.join(UPLOAD_DIR, id_item)
    if (!fs.existsSync(itemDir)) fs.mkdirSync(itemDir, { recursive: true })
    fs.writeFileSync(path.join(itemDir, safeName), buffer)
    db.prepare(`
      INSERT INTO documentos (id_item, nombre_original, nombre_archivo, tipo, tamanio, usuario, storage)
      VALUES (?,?,?,?,?,?,'local')
    `).run(id_item, file.name, safeName, contentType, file.size, usuario)
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
