export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') ?? 'totales'

  const wb = XLSX.utils.book_new()

  if (tipo === 'totales' || tipo === 'completo') {
    const totales = db.prepare(`
      SELECT i.id_item, i.detalle, i.id_envio, i.shipper, i.consignee, i.destino_final,
        i.estado, i.estado_documentacion,
        COALESCE(dc.precio_sf_usd, 0) as precio_sf_usd,
        COALESCE(gi.total, 0) as total_gi,
        COALESCE((SELECT SUM(og.total_usd) FROM otros_gastos og WHERE og.id_item=i.id_item),0) as otros_gastos,
        COALESCE((SELECT SUM(gp.gasto_proporcional_usd) FROM gastos_proporcionales gp WHERE gp.id_item=i.id_item),0) as gasto_log,
        COALESCE(dc.precio_sf_usd,0)+COALESCE(gi.total,0)+
        COALESCE((SELECT SUM(og.total_usd) FROM otros_gastos og WHERE og.id_item=i.id_item),0)+
        COALESCE((SELECT SUM(gp.gasto_proporcional_usd) FROM gastos_proporcionales gp WHERE gp.id_item=i.id_item),0) as total_operacion_usd
      FROM items i
      LEFT JOIN detalle_compras dc ON dc.id_item=i.id_item
      LEFT JOIN gastos_importacion gi ON gi.id_item=i.id_item
      ORDER BY i.id_item
    `).all()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(totales), 'Total x Ítem')
  }

  if (tipo === 'envios' || tipo === 'completo') {
    const envios = db.prepare(`
      SELECT e.*, COUNT(i.id) as total_items
      FROM envios e LEFT JOIN items i ON i.id_envio=e.id_envio
      GROUP BY e.id ORDER BY e.created_at DESC
    `).all()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(envios), 'Envíos')
  }

  if (tipo === 'aduana' || tipo === 'completo') {
    const despachos = db.prepare('SELECT * FROM despachos ORDER BY created_at DESC').all()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(despachos), 'Aduana')
  }

  if (tipo === 'items' || tipo === 'completo') {
    const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items), 'Ítems')
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="COMEX_GC_${tipo}_${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  })
}
