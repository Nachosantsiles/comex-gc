export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads')

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const doc = db.prepare('SELECT * FROM documentos WHERE id=?').get(id) as any
  if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const filePath = path.join(UPLOAD_DIR, doc.id_item, doc.nombre_archivo)
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })

  const buffer = fs.readFileSync(filePath)
  const ext = doc.nombre_archivo.split('.').pop()?.toLowerCase()

  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png',
  }
  const contentType = mimeMap[ext] ?? 'application/octet-stream'

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${doc.nombre_original}"`,
    },
  })
}
