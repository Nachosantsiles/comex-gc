export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import * as XLSX from 'xlsx'

const TABLES: { sheet: string; query: string }[] = [
  {
    sheet: 'Items',
    query: `SELECT i.*, e.ref_contenedor, e.eta as envio_eta
            FROM items i LEFT JOIN envios e ON e.id_envio = i.id_envio
            ORDER BY i.created_at DESC`,
  },
  {
    sheet: 'Envios',
    query: `SELECT * FROM envios ORDER BY created_at DESC`,
  },
  {
    sheet: 'Despachos',
    query: `SELECT d.*, GROUP_CONCAT(di.id_item, ', ') as items_asignados
            FROM despachos d
            LEFT JOIN despacho_items di ON di.id_despacho = d.id_despacho
            GROUP BY d.id ORDER BY d.created_at DESC`,
  },
  {
    sheet: 'Gastos_Logisticos',
    query: `SELECT gl.*, COALESCE(SUM(r.recargo_usd),0) as total_recargos
            FROM gastos_logisticos gl
            LEFT JOIN recargos_logisticos r ON r.id_gasto = gl.id_gasto
            GROUP BY gl.id ORDER BY gl.created_at DESC`,
  },
  {
    sheet: 'Recargos_Logisticos',
    query: `SELECT * FROM recargos_logisticos ORDER BY id`,
  },
  {
    sheet: 'Gastos_Proporcionales',
    query: `SELECT gp.*, i.detalle as item_detalle
            FROM gastos_proporcionales gp
            LEFT JOIN items i ON i.id_item = gp.id_item
            ORDER BY gp.id_gasto, gp.id_item`,
  },
  {
    sheet: 'Detalle_Compras',
    query: `SELECT dc.*, i.detalle as item_detalle
            FROM detalle_compras dc
            LEFT JOIN items i ON i.id_item = dc.id_item
            ORDER BY dc.id`,
  },
  {
    sheet: 'Otros_Gastos',
    query: `SELECT o.*, i.detalle as item_detalle
            FROM otros_gastos_items o
            LEFT JOIN items i ON i.id_item = o.id_item
            ORDER BY o.id`,
  },
  {
    sheet: 'Gastos_Importacion',
    query: `SELECT g.*, i.detalle as item_detalle
            FROM gastos_importacion_items g
            LEFT JOIN items i ON i.id_item = g.id_item
            ORDER BY g.id`,
  },
  {
    sheet: 'Documentos',
    query: `SELECT d.*, i.detalle as item_detalle
            FROM documentos d
            LEFT JOIN items i ON i.id_item = d.id_item
            ORDER BY d.created_at DESC`,
  },
  {
    sheet: 'Proveedores',
    query: `SELECT * FROM proveedores_internacionales ORDER BY nombre`,
  },
  {
    sheet: 'Catalogos',
    query: `SELECT * FROM catalogos ORDER BY tipo, valor`,
  },
  {
    sheet: 'Usuarios',
    // Exclude password_hash for security
    query: `SELECT id, name, email, role, active, perm_version, created_at FROM users ORDER BY id`,
  },
]

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const wb = XLSX.utils.book_new()
  const fecha = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // Cover sheet with metadata
  const meta = [
    ['Backup COMEX GC'],
    ['Fecha', fecha],
    ['Generado por', (session.user as any)?.email ?? 'usuario'],
    [],
    ['Hoja', 'Descripción'],
    ['Items', 'Ítems de importación'],
    ['Envios', 'Envíos / shipments'],
    ['Despachos', 'Despachos aduaneros'],
    ['Gastos_Logisticos', 'Gastos logísticos con moneda'],
    ['Recargos_Logisticos', 'Recargos adicionales por gasto'],
    ['Gastos_Proporcionales', 'Distribución proporcional de gastos por ítem'],
    ['Detalle_Compras', 'Detalle de compras / facturas'],
    ['Otros_Gastos', 'Otros gastos por ítem'],
    ['Gastos_Importacion', 'Gastos de importación por ítem'],
    ['Documentos', 'Documentos adjuntos (metadatos)'],
    ['Proveedores', 'Proveedores internacionales'],
    ['Catalogos', 'Valores de catálogos dinámicos'],
    ['Usuarios', 'Usuarios del sistema (sin contraseñas)'],
  ]
  const coverWs = XLSX.utils.aoa_to_sheet(meta)
  coverWs['!cols'] = [{ wch: 28 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, coverWs, 'Indice')

  // Export each table
  for (const { sheet, query } of TABLES) {
    try {
      const rows = db.prepare(query).all() as any[]
      const ws = rows.length > 0
        ? XLSX.utils.json_to_sheet(rows)
        : XLSX.utils.aoa_to_sheet([['Sin datos']])
      // Auto-fit columns (approximate)
      if (rows.length > 0) {
        const cols = Object.keys(rows[0])
        ws['!cols'] = cols.map(k => ({
          wch: Math.min(40, Math.max(12, k.length + 2))
        }))
      }
      XLSX.utils.book_append_sheet(wb, ws, sheet)
    } catch (_) {
      // Table may not exist in older DBs — skip silently
      const ws = XLSX.utils.aoa_to_sheet([['Tabla no disponible']])
      XLSX.utils.book_append_sheet(wb, ws, sheet)
    }
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="comex-backup-${fecha}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
