import db from './db'

let _initialized = false

export function initializeDatabase() {
  if (_initialized) return
  _initialized = true
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS envios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_envio TEXT UNIQUE NOT NULL,
      tipo_transporte TEXT,
      modalidad TEXT,
      nombre_agencia TEXT,
      ref_contenedor TEXT,
      origen TEXT,
      destino TEXT,
      incoterm TEXT,
      gestion TEXT,
      nombre_empresa TEXT,
      bl_awb_crt TEXT,
      bl_tipo TEXT,
      fecha_carga TEXT,
      etd TEXT,
      fecha_salida TEXT,
      eta TEXT,
      fecha_llegada_puerto TEXT,
      fecha_llegada_lr TEXT,
      fecha_desconsolidacion TEXT,
      observaciones TEXT,
      cerrado INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_item TEXT UNIQUE NOT NULL,
      id_envio TEXT REFERENCES envios(id_envio),
      detalle TEXT,
      shipper TEXT,
      consignee TEXT,
      nro_factura TEXT,
      valor_total_factura REAL,
      moneda TEXT DEFAULT 'USD',
      estado_documentacion TEXT DEFAULT 'Pendiente',
      estado TEXT DEFAULT 'Depósito Origen',
      destino_final TEXT,
      eta TEXT,
      etd TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS despachos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_despacho TEXT UNIQUE NOT NULL,
      id_envio TEXT REFERENCES envios(id_envio),
      turno_retiro TEXT,
      estado TEXT DEFAULT 'En curso',
      canal TEXT,
      motivo_demora TEXT,
      fecha_oficializacion TEXT,
      fecha_liberacion TEXT,
      fecha_desconsolidacion TEXT,
      nombre_despachante TEXT,
      honorarios_pesos REAL,
      tipo_cambio REAL,
      honorarios_usd REAL,
      gastos_extras_usd REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS despacho_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_despacho TEXT NOT NULL REFERENCES despachos(id_despacho),
      id_item TEXT NOT NULL REFERENCES items(id_item),
      UNIQUE(id_despacho, id_item)
    );

    CREATE TABLE IF NOT EXISTS detalle_compras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_item TEXT UNIQUE NOT NULL REFERENCES items(id_item),
      id_despacho TEXT REFERENCES despachos(id_despacho),
      proveedor_internacional TEXT,
      precio_orig REAL,
      moneda_orig TEXT DEFAULT 'USD',
      tc_a_usd REAL DEFAULT 1,
      precio_usd REAL,
      comision_sf_pct REAL DEFAULT 10,
      precio_sf_usd REAL,
      valor_factura_sf REAL,
      nro_factura_sf TEXT,
      fecha_factura_sf TEXT,
      moneda_sf TEXT DEFAULT 'EUR',
      tc_sf_a_usd REAL DEFAULT 1,
      sf_mercaderia REAL,
      sf_flete REAL,
      sf_seguro REAL,
      total_sf REAL,
      total_sf_usd REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gastos_importacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_item TEXT UNIQUE NOT NULL REFERENCES items(id_item),
      derecho_impo REAL DEFAULT 0,
      tasa_estadistica REAL DEFAULT 0,
      di_usados REAL DEFAULT 0,
      iva REAL DEFAULT 0,
      iva_inscr REAL DEFAULT 0,
      ingresos_brutos REAL DEFAULT 0,
      imp_ganancias REAL DEFAULT 0,
      arancel_sim REAL DEFAULT 0,
      total REAL GENERATED ALWAYS AS (
        COALESCE(derecho_impo,0)+COALESCE(tasa_estadistica,0)+COALESCE(di_usados,0)+
        COALESCE(iva,0)+COALESCE(iva_inscr,0)+COALESCE(ingresos_brutos,0)+
        COALESCE(imp_ganancias,0)+COALESCE(arancel_sim,0)
      ) STORED,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gastos_importacion_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_item TEXT NOT NULL REFERENCES items(id_item),
      concepto TEXT NOT NULL,
      monto_usd REAL DEFAULT 0,
      orden INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS otros_gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_item TEXT NOT NULL REFERENCES items(id_item),
      tipo TEXT NOT NULL,
      precio_pesos REAL,
      tipo_cambio REAL,
      total_usd REAL,
      UNIQUE(id_item, tipo)
    );

    CREATE TABLE IF NOT EXISTS otros_gastos_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_item TEXT NOT NULL REFERENCES items(id_item),
      concepto TEXT NOT NULL,
      precio_pesos REAL,
      tipo_cambio REAL,
      total_usd REAL,
      orden INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS gastos_logisticos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_gasto TEXT UNIQUE NOT NULL,
      id_envio TEXT NOT NULL REFERENCES envios(id_envio),
      nombre_agencia TEXT,
      id_tipo_contenedor TEXT,
      peso_total_kg REAL,
      volumen_total_m3 REAL,
      gastos_origen_usd REAL DEFAULT 0,
      flete_internacional_usd REAL DEFAULT 0,
      gastos_destino_usd REAL DEFAULT 0,
      nombre_terminal TEXT,
      flete_interno_usd REAL DEFAULT 0,
      criterio_distribucion TEXT DEFAULT 'volumen',
      total_usd REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recargos_logisticos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_gasto TEXT NOT NULL REFERENCES gastos_logisticos(id_gasto),
      detalle TEXT,
      recargo_usd REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS gastos_proporcionales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_gasto TEXT NOT NULL REFERENCES gastos_logisticos(id_gasto),
      id_item TEXT NOT NULL REFERENCES items(id_item),
      volumen_item_m3 REAL,
      peso_item_kg REAL,
      gasto_proporcional_usd REAL,
      UNIQUE(id_gasto, id_item)
    );

    CREATE TABLE IF NOT EXISTS container_types (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      peso_max_kg REAL NOT NULL,
      volumen_max_m3 REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS catalogos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      valor TEXT NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1,
      UNIQUE(tipo, valor)
    );

    CREATE TABLE IF NOT EXISTS historial_fechas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_envio TEXT NOT NULL REFERENCES envios(id_envio),
      campo TEXT NOT NULL,
      valor_anterior TEXT,
      valor_nuevo TEXT,
      motivo TEXT,
      usuario TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS proveedores_internacionales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tabla TEXT NOT NULL,
      registro_id TEXT NOT NULL,
      campo TEXT,
      valor_anterior TEXT,
      valor_nuevo TEXT,
      accion TEXT NOT NULL,
      usuario TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_item TEXT NOT NULL REFERENCES items(id_item),
      nombre_original TEXT NOT NULL,
      nombre_archivo TEXT NOT NULL,
      tipo TEXT NOT NULL,
      tamanio INTEGER NOT NULL,
      usuario TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS counters (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reportes_historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gestion TEXT NOT NULL,
      notas TEXT,
      total_items INTEGER NOT NULL DEFAULT 0,
      total_cartera_usd REAL NOT NULL DEFAULT 0,
      total_mercaderia_usd REAL NOT NULL DEFAULT 0,
      total_sf_usd REAL NOT NULL DEFAULT 0,
      total_gi_usd REAL NOT NULL DEFAULT 0,
      total_log_usd REAL NOT NULL DEFAULT 0,
      total_honorarios_usd REAL NOT NULL DEFAULT 0,
      total_otros_usd REAL NOT NULL DEFAULT 0,
      promedio_por_item_usd REAL NOT NULL DEFAULT 0,
      dias_transito_avg REAL,
      dias_aduana_avg REAL,
      dias_ciclo_avg REAL,
      items_liberados INTEGER NOT NULL DEFAULT 0,
      items_retrasados INTEGER NOT NULL DEFAULT 0,
      items_en_curso INTEGER NOT NULL DEFAULT 0,
      usuario TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Migrate existing tables: add columns if they don't exist
  const migrations = [
    `ALTER TABLE envios ADD COLUMN cerrado INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE detalle_compras ADD COLUMN moneda_sf TEXT DEFAULT 'EUR'`,
    `ALTER TABLE detalle_compras ADD COLUMN tc_sf_a_usd REAL DEFAULT 1`,
    `ALTER TABLE gastos_logisticos ADD COLUMN criterio_distribucion TEXT DEFAULT 'volumen'`,
    `ALTER TABLE items ADD COLUMN tipo_importacion TEXT`,
    `ALTER TABLE items ADD COLUMN categoria TEXT`,
    // RBAC: perm_version column for JWT staleness detection
    `ALTER TABLE users ADD COLUMN perm_version INTEGER NOT NULL DEFAULT 1`,
  ]
  for (const sql of migrations) {
    try { db.exec(sql) } catch (_) {}
  }

  // Migrate users table: add perm_version and drop old role CHECK constraint
  // Must run BEFORE creating user_permissions (which references users)
  try {
    const tableSql = (db.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
    ).get() as any)?.sql ?? ''
    const needsMigration = tableSql.includes("CHECK(role IN ('admin','editor','viewer'))")
      || (!tableSql.includes('perm_version') && !tableSql.includes('supervisor'))

    if (needsMigration) {
      db.pragma('foreign_keys = OFF')
      try {
        db.exec(`
          DROP TABLE IF EXISTS users_new;
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer',
            active INTEGER NOT NULL DEFAULT 1,
            perm_version INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO users_new(id, name, email, password_hash, role, active, perm_version, created_at)
            SELECT id, name, email, password_hash, role, active,
                   COALESCE(perm_version, 1), created_at FROM users;
          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
        `)
      } finally {
        db.pragma('foreign_keys = ON')
      }
    }
  } catch (_) {
    try { db.pragma('foreign_keys = ON') } catch (_) {}
  }

  // user_permissions — created AFTER users migration so FK is valid
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission TEXT NOT NULL,
      granted INTEGER NOT NULL DEFAULT 1 CHECK(granted IN (0, 1)),
      UNIQUE(user_id, permission)
    );
    CREATE INDEX IF NOT EXISTS idx_user_perms_uid ON user_permissions(user_id);
  `)

  const insertContainer = db.prepare(
    `INSERT OR IGNORE INTO container_types(id, nombre, peso_max_kg, volumen_max_m3) VALUES (?,?,?,?)`
  )
  const containers = [
    ["20' DV", "20' DV", 21770, 33.2],
    ["40' DV", "40' DV", 26750, 67.7],
    ["40' DV HC", "40' DV HC", 26460, 76.4],
    ["20' Reefer", "20' Reefer", 27400, 28.0],
    ["40' Reefer HC", "40' Reefer HC", 27700, 67.6],
    ["40' TK (IMO)", "40' TK (IMO)", 26000, 25.0],
    ["20' TK (IMO)", "20' TK (IMO)", 20300, 21.0],
    ["20' Open Top", "20' Open Top", 21600, 32.5],
    ["40' Open Top", "40' Open Top", 26700, 66.4],
    ["20' Flat Rack", "20' Flat Rack", 30480, 28.0],
    ["40' Flat Rack", "40' Flat Rack", 39600, 62.0],
    ["Aéreo", "Aéreo", 1000, 10.0],
    ["Semirremolque", "Semirremolque", 24000, 82.0],
  ]
  containers.forEach(c => insertContainer.run(...c))

  // Seed catalogos with initial values
  const inscat = db.prepare(`INSERT OR IGNORE INTO catalogos(tipo, valor) VALUES (?,?)`)
  const seeds: [string, string][] = [
    ['agencia', 'MSC'], ['agencia', 'Maersk'], ['agencia', 'CMA CGM'], ['agencia', 'COSCO Shipping'],
    ['agencia', 'Hapag-Lloyd'], ['agencia', 'ONE'], ['agencia', 'Evergreen'], ['agencia', 'Yang Ming'],
    ['agencia', 'HMM'], ['agencia', 'ZIM'],
    ['empresa', 'Cazorla Logística'], ['empresa', 'Danzas'], ['empresa', 'DB Schenker'],
    ['empresa', 'Kuehne+Nagel'], ['empresa', 'Geodis'], ['empresa', 'Panalpina'],
    ['origen', 'Algeciras'], ['origen', 'Arhal'], ['origen', 'Bilbao'],
    ['origen', 'Madrid'], ['origen', 'Santiago'], ['origen', 'Montevideo'],
    ['destino', 'Buenos Aires'], ['destino', 'La Rioja'],
    ['shipper', 'Aceitunas Cazorla'], ['shipper', 'Arasol'], ['shipper', 'Tomcoex'],
    ['shipper', 'Stone Factory'], ['shipper', 'Desinco'], ['shipper', 'GWE Tubomin'],
    ['shipper', 'Jebsen & Jessen'], ['shipper', 'Anrosar Bedi'], ['shipper', 'Robinson Crusoe'],
    ['consignee', 'Mission Argentina'], ['consignee', 'Seville Cazorla'], ['consignee', 'Tomalar'],
    ['consignee', 'Ardim'], ['consignee', 'Altea Agro'], ['consignee', 'Capellans'],
    ['consignee', 'San Gabriel'],
    ['terminal', 'Terminal 4'], ['terminal', 'Exolgan'], ['terminal', 'TRP'],
    ['destino_final', 'Altea Agro'], ['destino_final', 'Ardim'], ['destino_final', 'Capellans'],
    ['destino_final', 'Mission Argentina'], ['destino_final', 'San Gabriel'],
    ['destino_final', 'Seville Cazorla'], ['destino_final', 'Tomalar'],
    ['tipo_importacion', 'Importación (IC)'],
    ['tipo_importacion', 'Importación Temporal (IT)'],
    ['tipo_importacion', 'Muestras'],
    ['categoria_item', 'Material Auxiliar (cartón, bolsas, separadores, cartopallets, etiquetas)'],
    ['categoria_item', 'Cajas metálicas'],
    ['categoria_item', 'Bidones Nuevos'],
    ['categoria_item', 'Bidones Usados'],
    ['categoria_item', 'Insumos químicos'],
    ['categoria_item', 'Maquinaria Nueva'],
    ['categoria_item', 'Maquinaria Usada'],
    ['categoria_item', 'Repuestos de maquinaria'],
    ['categoria_item', 'Muestras comerciales'],
    ['categoria_item', 'Insumos de laboratorio'],
    ['categoria_item', 'Herramientas'],
    ['categoria_item', 'Plantines de Olivo'],
  ]
  seeds.forEach(([tipo, valor]) => inscat.run(tipo, valor))

  // Seed proveedores
  const insprov = db.prepare(`INSERT OR IGNORE INTO proveedores_internacionales(nombre) VALUES (?)`)
  const proveedores = ['Stone Factory', 'Aceitunas Cazorla', 'Arasol', 'Tomcoex', 'Desinco']
  proveedores.forEach(p => insprov.run(p))

  try {
    const bcrypt = require('bcryptjs')
    const hash = bcrypt.hashSync('admin123', 10)
    db.prepare(
      `INSERT OR IGNORE INTO users(name, email, password_hash, role) VALUES (?,?,?,?)`
    ).run('Administrador', 'admin@cazorla.com', hash, 'admin')
  } catch (_) {}

  const counters = ['envio', 'item', 'gasto']
  const insertCounter = db.prepare(`INSERT OR IGNORE INTO counters(key, value) VALUES (?,0)`)
  counters.forEach(k => insertCounter.run(k))
}

export function nextId(prefix: string, key: string): string {
  const year = new Date().getFullYear()
  db.prepare(`INSERT OR IGNORE INTO counters(key,value) VALUES (?,0)`).run(key)
  const result = db.prepare(`UPDATE counters SET value=value+1 WHERE key=? RETURNING value`).get(key) as { value: number }
  return `${prefix}-${year}-${String(result.value).padStart(3, '0')}`
}
