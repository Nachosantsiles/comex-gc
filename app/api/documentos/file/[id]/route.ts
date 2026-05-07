export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { getFromR2 } from '@/lib/r2'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads')

const mimeMap: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const doc = db.prepare('SELECT * FROM documentos WHERE id=?').get(id) as any
  if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const ext = doc.nombre_original.split('.').pop()?.toLowerCase() ?? ''
  const contentType = doc.tipo || mimeMap[ext] || 'application/octet-stream'

  let buffer: Buffer

  if (doc.storage === 'r2') {
    // ── Cloudflare R2 ──────────────────────────────────────────────────────
    buffer = await getFromR2(doc.nombre_archivo)
  } else {
    // ── Local filesystem ───────────────────────────────────────────────────
    const filePath = path.join(UPLOAD_DIR, doc.id_item, doc.nombre_archivo)
    if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    buffer = fs.readFileSync(filePath)
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${doc.nombre_original}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
