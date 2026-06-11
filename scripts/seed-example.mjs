/**
 * SEED DE EJEMPLO — COMEX GC
 * Crea un caso completo con trazabilidad total:
 *   Envío E-25-001 (marítimo España → La Rioja)
 *   └── 3 ítems con shippers y facturas
 *       ├── I-25-001: Aceitunas negras  (Cazorla)
 *       ├── I-25-002: Aceite de oliva   (Arasol)
 *       └── I-25-003: Accesorios granel (Desinco)
 *   └── 2 gastos logísticos
 *       ├── Flete MSC (USD)
 *       └── Almacenaje terminal (ARS → USD)
 *   └── 1 despacho aduanero
 *
 * Uso: node scripts/seed-example.mjs
 */

import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'data', 'comex.db')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 5000')
db.pragma('foreign_keys = ON')

console.log('\n🌱  COMEX GC — Seed de ejemplo\n')

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENVÍO
// ─────────────────────────────────────────────────────────────────────────────
const envioId = 'E-25-001'

const existingEnvio = db.prepare('SELECT id_envio FROM envios WHERE id_envio=?').get(envioId)
if (existingEnvio) {
  console.log(`⚠️  El envío ${envioId} ya existe. Borrando datos previos del ejemplo...`)
  db.prepare(`DELETE FROM gastos_proporcionales WHERE id_gasto IN (SELECT id_gasto FROM gastos_logisticos WHERE id_envio=?)`).run(envioId)
  db.prepare(`DELETE FROM recargos_logisticos WHERE id_gasto IN (SELECT id_gasto FROM gastos_logisticos WHERE id_envio=?)`).run(envioId)
  db.prepare(`DELETE FROM gastos_logisticos WHERE id_envio=?`).run(envioId)
  db.prepare(`DELETE FROM despacho_items WHERE id_despacho IN (SELECT id_despacho FROM despachos WHERE id_envio=?)`).run(envioId)
  db.prepare(`DELETE FROM despachos WHERE id_envio=?`).run(envioId)
  db.prepare(`DELETE FROM items WHERE id_envio=?`).run(envioId)
  db.prepare(`DELETE FROM envios WHERE id_envio=?`).run(envioId)
  console.log('   ✓ Datos previos eliminados\n')
}

db.prepare(`
  INSERT INTO envios (
    id_envio, tipo_transporte, modalidad, nombre_agencia, ref_contenedor,
    origen, destino, incoterm, gestion, nombre_empresa,
    bl_awb_crt, bl_tipo, fecha_carga, etd, fecha_salida, eta,
    fecha_llegada_puerto, fecha_llegada_lr, observaciones, cerrado
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`).run(
  envioId,
  'Marítimo FCL',
  'FCL (contenedor completo)',
  'Grupo Cazorla Forwarder',
  'MSCU7821456',
  'Algeciras',
  'Buenos Aires',
  'CIF',
  'Forwarder',
  'MSC Mediterranean Shipping',
  'MSCESZ123456',
  'BL (Marítimo)',
  '2025-03-10',       // fecha_carga
  '2025-03-15',       // etd
  '2025-03-15',       // fecha_salida
  '2025-04-18',       // eta
  '2025-04-20',       // fecha_llegada_puerto
  '2025-04-28',       // fecha_llegada_lr
  'Contenedor de 40HC. Tres clientes distintos consolidados.',
  0
)

console.log(`✅  Envío creado: ${envioId}`)
console.log(`    Ruta: Algeciras → Buenos Aires → La Rioja`)
console.log(`    Contenedor: MSCU7821456  |  BL: MSCESZ123456`)
console.log(`    ETD: 15-Mar-2025  |  ETA: 18-Abr-2025  |  Llegó LR: 28-Abr-2025\n`)

// ─────────────────────────────────────────────────────────────────────────────
// 2. ÍTEMS
// ─────────────────────────────────────────────────────────────────────────────
const items = [
  {
    id_item: 'I-25-001',
    detalle: 'Aceitunas negras deshuesadas en salmuera x 200kg',
    shipper: 'Aceitunas Cazorla',
    consignee: 'Mission Argentina',
    nro_factura: 'FAC-CZL-2025-0312',
    valor_total_factura: 28500.00,
    moneda: 'EUR',
    estado_documentacion: 'Aprobado',
    estado: 'Zona Primaria LR',
    destino_final: 'Mission Argentina',
    eta: '2025-04-18',
    etd: '2025-03-15',
    tipo_importacion: 'IC',
    categoria: 'Alimentos',
  },
  {
    id_item: 'I-25-002',
    detalle: 'Aceite de oliva virgen extra 1L x 500 unidades',
    shipper: 'Arasol',
    consignee: 'Seville Cazorla',
    nro_factura: 'FAC-ARS-2025-0089',
    valor_total_factura: 15200.00,
    moneda: 'EUR',
    estado_documentacion: 'Presentado',
    estado: 'Zona Primaria LR',
    destino_final: 'Seville Cazorla',
    eta: '2025-04-18',
    etd: '2025-03-15',
    tipo_importacion: 'IC',
    categoria: 'Alimentos',
  },
  {
    id_item: 'I-25-003',
    detalle: 'Insumos de packaging: tapas, etiquetas, films termorretráctil',
    shipper: 'Desinco',
    consignee: 'Ardim',
    nro_factura: 'FAC-DSC-2025-0201',
    valor_total_factura: 4800.00,
    moneda: 'USD',
    estado_documentacion: 'En Preparación',
    estado: 'Zona Primaria LR',
    destino_final: 'Ardim',
    eta: '2025-04-18',
    etd: '2025-03-15',
    tipo_importacion: 'IT',
    categoria: 'Insumos',
  },
]

const insertItem = db.prepare(`
  INSERT INTO items (id_item, id_envio, detalle, shipper, consignee, nro_factura,
    valor_total_factura, moneda, estado_documentacion, estado, destino_final,
    eta, etd, tipo_importacion, categoria)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`)

for (const it of items) {
  insertItem.run(
    it.id_item, envioId, it.detalle, it.shipper, it.consignee, it.nro_factura,
    it.valor_total_factura, it.moneda, it.estado_documentacion, it.estado,
    it.destino_final, it.eta, it.etd, it.tipo_importacion, it.categoria
  )
  const monedaStr = it.moneda !== 'USD' ? ` (${it.moneda} ${it.valor_total_factura.toLocaleString()})` : ''
  console.log(`✅  Ítem: ${it.id_item}`)
  console.log(`    ${it.detalle}`)
  console.log(`    Shipper: ${it.shipper}  →  Consignee: ${it.consignee}`)
  console.log(`    Factura: ${it.nro_factura}  USD ${it.valor_total_factura.toLocaleString()}${monedaStr}`)
  console.log(`    Estado Doc.: ${it.estado_documentacion}  |  Estado: ${it.estado}\n`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GASTOS LOGÍSTICOS
// ─────────────────────────────────────────────────────────────────────────────
const gastos = [
  {
    id_gasto: 'GL-MSC-2025-001',
    id_envio: envioId,
    nombre_agencia: 'MSC Mediterranean Shipping',
    id_tipo_contenedor: '40HC',
    peso_total_kg: 18500,
    volumen_total_m3: 67.2,
    gastos_origen_usd: 3200.00,
    flete_internacional_usd: 0,
    gastos_destino_usd: 450.00,
    nombre_terminal: 'Terminal 4',
    flete_interno_usd: 180.00,
    total_usd: 3830.00,
    criterio_distribucion: 'por_valor',
    moneda: 'USD',
    tipo_cambio: 1,
  },
  {
    id_gasto: 'GL-ALM-2025-002',
    id_envio: envioId,
    nombre_agencia: 'Grupo Cazorla Forwarder',
    id_tipo_contenedor: '40HC',
    peso_total_kg: 18500,
    volumen_total_m3: 67.2,
    gastos_origen_usd: 0,
    flete_internacional_usd: 0,
    gastos_destino_usd: 686000,
    nombre_terminal: 'Terminal 4',
    flete_interno_usd: 0,
    total_usd: 700.00,
    criterio_distribucion: 'por_valor',
    moneda: 'ARS',
    tipo_cambio: 980.00,
  },
]

const insertGasto = db.prepare(`
  INSERT INTO gastos_logisticos (id_gasto, id_envio, nombre_agencia, id_tipo_contenedor,
    peso_total_kg, volumen_total_m3, gastos_origen_usd, flete_internacional_usd,
    gastos_destino_usd, nombre_terminal, flete_interno_usd, total_usd,
    criterio_distribucion, moneda, tipo_cambio)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`)

for (const g of gastos) {
  insertGasto.run(
    g.id_gasto, g.id_envio, g.nombre_agencia, g.id_tipo_contenedor,
    g.peso_total_kg, g.volumen_total_m3, g.gastos_origen_usd, g.flete_internacional_usd,
    g.gastos_destino_usd, g.nombre_terminal, g.flete_interno_usd, g.total_usd,
    g.criterio_distribucion, g.moneda, g.tipo_cambio
  )
  const monedaTag = g.moneda !== 'USD' ? ` [${g.moneda} → USD, TC: ${g.tipo_cambio}]` : ''
  console.log(`✅  Gasto logístico: ${g.id_gasto}${monedaTag}`)
  console.log(`    Agencia: ${g.nombre_agencia}  |  Contenedor: ${g.id_tipo_contenedor}  |  ${g.peso_total_kg} kg / ${g.volumen_total_m3} m³`)
  console.log(`    Total USD: $${g.total_usd.toLocaleString()}\n`)
}

// Proporcionales: distribuir por valor de factura
// Conversiones a USD: I-25-001 EUR 28500 ≈ USD 30780, I-25-002 EUR 15200 ≈ USD 16416, I-25-003 USD 4800
const totalBase = 30780 + 16416 + 4800
const propBase = [
  { id_item: 'I-25-001', prop: 30780 / totalBase },
  { id_item: 'I-25-002', prop: 16416 / totalBase },
  { id_item: 'I-25-003', prop: 4800  / totalBase },
]
const insertProp = db.prepare(`
  INSERT OR IGNORE INTO gastos_proporcionales (id_gasto, id_item, volumen_item_m3, peso_item_kg, gasto_proporcional_usd)
  VALUES (?,?,?,?,?)
`)
const volProp = [
  { id_item: 'I-25-001', vol: 35.0, peso: 9600 },
  { id_item: 'I-25-002', vol: 22.0, peso: 6100 },
  { id_item: 'I-25-003', vol: 10.2, peso: 2800 },
]
for (const p of propBase) {
  const monto = parseFloat((p.prop * 3830).toFixed(2))
  const vp = volProp.find(v => v.id_item === p.id_item)
  insertProp.run('GL-MSC-2025-001', p.id_item, vp.vol, vp.peso, monto)
}
for (const p of propBase) {
  const monto = parseFloat((p.prop * 700).toFixed(2))
  const vp = volProp.find(v => v.id_item === p.id_item)
  insertProp.run('GL-ALM-2025-002', p.id_item, vp.vol, vp.peso, monto)
}

console.log(`✅  Gastos proporcionales distribuidos entre los 3 ítems`)
console.log(`    GL-MSC-2025-001  →  USD 3.830 prorrateado por valor FOB`)
console.log(`    GL-ALM-2025-002  →  USD 700 prorrateado por valor FOB\n`)

// ─────────────────────────────────────────────────────────────────────────────
// 4. DESPACHO ADUANERO
// ─────────────────────────────────────────────────────────────────────────────
const despachoId = 'D-25-001'
db.prepare(`
  INSERT INTO despachos (id_despacho, id_envio, estado, canal, fecha_oficializacion,
    fecha_liberacion, nombre_despachante, honorarios_pesos, tipo_cambio, honorarios_usd)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`).run(
  despachoId, envioId, 'Liberado', 'Verde',
  '2025-04-22', '2025-04-26',
  'Estudio Jurídico Alderete & Asoc.',
  490000, 980, 500
)

const insertDespachoItem = db.prepare('INSERT OR IGNORE INTO despacho_items (id_despacho, id_item) VALUES (?,?)')
for (const it of items) {
  insertDespachoItem.run(despachoId, it.id_item)
}

console.log(`✅  Despacho aduanero: ${despachoId}`)
console.log(`    Despachante: Estudio Jurídico Alderete & Asoc.`)
console.log(`    Canal: Verde  |  Oficializado: 22-Abr-2025  |  Liberado: 26-Abr-2025`)
console.log(`    Honorarios: ARS 490.000 (≈ USD 500 @ TC 980)`)
console.log(`    Ítems asignados: ${items.map(i => i.id_item).join(', ')}\n`)

// ─────────────────────────────────────────────────────────────────────────────
// 5. RESUMEN DE TRAZABILIDAD
// ─────────────────────────────────────────────────────────────────────────────
const totalFacturas = items.reduce((acc, it) => {
  const usd = it.moneda === 'EUR' ? it.valor_total_factura * 1.08 : it.valor_total_factura
  return acc + usd
}, 0)
const totalGastosLog = gastos.reduce((a, g) => a + g.total_usd, 0)

console.log('═'.repeat(60))
console.log('  TRAZABILIDAD COMPLETA — E-25-001')
console.log('═'.repeat(60))
console.log()
console.log('📦  ENVÍO')
console.log(`    ${envioId}  |  Marítimo FCL  |  Algeciras → La Rioja`)
console.log(`    Etapa actual: Llegó La Rioja (28-Abr-2025)`)
console.log()
console.log('📄  ÍTEMS  (3 productos, 3 shippers)')
for (const it of items) {
  const usd = it.moneda === 'EUR' ? (it.valor_total_factura * 1.08).toFixed(0) : it.valor_total_factura
  console.log(`    • ${it.id_item}  ${it.detalle.slice(0,42)}...`)
  console.log(`      Factura: ${it.nro_factura}  ≈ USD ${Number(usd).toLocaleString()}`)
  console.log(`      Doc: ${it.estado_documentacion}  |  Estado: ${it.estado}`)
}
console.log()
console.log('💰  GASTOS LOGÍSTICOS')
console.log(`    GL-MSC-2025-001  Flete MSC                  USD  3.830`)
console.log(`    GL-ALM-2025-002  Almacenaje Terminal 4 (ARS) USD    700  [TC: 980]`)
console.log(`                                                 ──────────`)
console.log(`                                     TOTAL LOG   USD  4.530`)
console.log()
console.log('🏛️  DESPACHO ADUANERO')
console.log(`    ${despachoId}  |  Canal Verde  |  Honorarios USD 500`)
console.log()
console.log('📊  DASHBOARD — valores que aparecen ahora')
console.log(`    Valor Mercadería (FOB/CIF aprox.)  ≈ USD ${Math.round(totalFacturas).toLocaleString()}`)
console.log(`    Gastos Logísticos                    USD ${totalGastosLog.toLocaleString()}`)
console.log()
console.log('═'.repeat(60))
console.log()
console.log('✅  Seed completado. Reiniciá el servidor Next.js si está corriendo')
console.log('   localmente, o esperá el próximo deploy en Railway.')
console.log()
