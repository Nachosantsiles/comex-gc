"use client";

/**
 * Genera un ID único. Usa crypto.randomUUID() cuando está disponible
 * (contextos seguros: HTTPS o localhost) y cae a un fallback manual
 * cuando no lo está (ej. acceso por IP de red local sobre HTTP), donde
 * crypto.randomUUID es undefined y rompería la creación de registros.
 */
export function uid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch { /* noop */ }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export type EmpresaOC = "Seville Cazorla" | "Tomalar";

export interface OrdenCompra {
  id: string;
  empresa: EmpresaOC;
  numero: string;
  correlativo: number;
  // Proveedor
  proveedor: string;
  proveedorId?: string;
  direccionProveedor?: string;
  ciudadPaisProveedor?: string;
  // Detalle
  insumo: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  moneda: "ARS" | "USD" | "EUR";
  tipoCambio?: number;       // tipo de cambio usado (solo si moneda ≠ ARS)
  iva: number;               // porcentaje, ej: 21 → 21%
  // Fechas
  fechaEmision: string;
  fechaEntrega: string;
  // Comercial
  numPresupuesto?: string;   // ej: 294/801
  fechaPresupuesto?: string;
  condicionPago?: string;    // texto libre con términos, CBU, alias, CUIT
  lugarEntrega?: string;     // texto libre, ej: Planta Seville – Ruta 38 km 434,5
  presupuestoArchivo?: { url: string; nombre: string; tipo: string };
  facturaArchivo?: { url: string; nombre: string; tipo: string };
  comprobantePagoArchivo?: { url: string; nombre: string; tipo: string };
  remitosArchivos?: { url: string; nombre: string; tipo: string }[];
  estado: "Pendiente" | "Parcial" | "Recibida" | "Cancelada";
  justificacion: string;
}

export function nextNumeroOC(empresa: EmpresaOC, ocs: OrdenCompra[]): { numero: string; correlativo: number } {
  const año = new Date().getFullYear();
  const prefix = empresa === "Seville Cazorla" ? "SC" : "TOM";
  const del_año = ocs.filter(o => o.empresa === empresa && o.fechaEmision?.startsWith(String(año)));
  const max = del_año.reduce((m, o) => Math.max(m, o.correlativo ?? 0), 0);
  const correlativo = max + 1;
  return { numero: `${prefix}-${año}-${String(correlativo).padStart(3, "0")}`, correlativo };
}

export interface DestinaciónIT {
  id: string;
  numero: string;           // código de destinación ARCA, ej: 26001IT14000278H
  descripcion: string;      // mercadería / artículo
  empresa?: EmpresaOC;
  regimen?: "IT" | "IC" | "Nacional";
  categoria: string;        // BOLSAS | CAJAS METÁLICAS | ETIQUETAS | INSUMOS QUÍMICOS | PMP Y GOODPACKS | MATERIAL AUXILIAR
  codigoProducto: string;   // código interno del producto (ej: 67450)
  proveedor: string;
  precioUnitarioUSD: number;    // precio por unidad en USD
  valorUSD: number;             // valor total de la importación en USD
  fechaAltaARCA: string;
  fechaVtoOriginal: string;
  fechaVtoProrroga: string;
  fechaVencimiento: string;
  stockDocumental: number;  // saldo MOA/ARCA según despachante
  stockFisico: number;      // stock físico contado en planta
  enProduccion: number;     // en proceso de producción
  desperdicios: number;     // mermas / desperdicios
  ptSeville: number;        // en producto terminado Seville
  ptTomalar: number;        // en producto terminado Tomalar
  unidad: string;
  estado: "" | "Prórroga otorgada" | "Prórroga solicitada" | "Solicitar Baja" | "Próxima a vencer" | "Con solicitud de baja" | "Sin info";
  observaciones: string;
}

export interface Poliza {
  id: string;
  numero: string;
  aseguradora: string;
  tipo: "Caución" | "Garantía" | "Otra";
  destinacionesVinculadas: string[];  // array de destinacion.numero
  montoGarantiaARS: number;           // monto garantizado en ARS
  montoGarantiaUSD: number;           // monto garantizado en USD
  primaARS: number;                   // prima mensual en ARS
  fechaEmision: string;
  fechaVencimiento: string;           // vto de la póliza (puede diferir del vto de destinación)
  estado: "Activa" | "Prórroga solicitada" | "Baja solicitada" | "Dada de baja";
  fechaGestion: string;               // fecha en que se solicitó la prórroga/baja
  motivoBaja: "" | "Saldo agotado" | "Saldo cero - exportado" | "Saldo cero - vencido" | "Nacionalización";
  observaciones: string;
}

export interface Cotizacion {
  id: string;
  fecha: string;
  insumo: string;
  unidad: string;
  cantidad: number;
  precio: number;
  moneda: "ARS" | "USD" | "EUR";
  tc: number;               // tipo de cambio ARS→USD (0 si no aplica)
  precioUSD: number;        // calculado: precio/tc si ARS, precio si USD
  vigente: boolean;
  observaciones: string;
}

export interface PrecioNegociado {
  id: string;
  fecha: string;
  insumo: string;
  unidad: string;
  precio: number;
  moneda: "ARS" | "USD" | "EUR";
  tc: number;
  precioUSD: number;
  validoHasta: string;
  observaciones: string;
}

export type NivelDocumento = "obligatorio" | "recomendado" | "complementario";
export type EstadoDocumento = "vigente" | "por_vencer" | "vencido" | "pendiente";

export interface DocumentoProveedor {
  id: string;
  nombre: string;          // ej: "FDS/SDS"
  nivel: NivelDocumento;
  fechaEmision?: string;
  fechaVencimiento?: string;
  archivo?: { url: string; nombre: string; tipo: string };
  observaciones?: string;
}

export interface Proveedor {
  id: string;
  codigo: string;
  razonSocial: string;
  empresa?: EmpresaOC;
  tipo: "Nacional" | "Extranjero";
  categorias: string[];     // múltiples categorías
  pais: string;
  contacto: string;
  email: string;
  telefono: string;
  cuit: string;
  condicionPago: string;
  moneda: "ARS" | "USD" | "EUR";
  plazoEntregaDias: number;
  calificacion: 1 | 2 | 3 | 4 | 5;
  homologado: boolean;
  fechaHomologacion: string;
  vencimientoHomologacion: string;
  numeroHomologacion: string;
  activo: boolean;
  observaciones: string;
  cotizaciones: Cotizacion[];
  preciosNegociados: PrecioNegociado[];
  documentos?: DocumentoProveedor[];
}

export interface InsumoStock {
  id: string;
  codigo: string;
  descripcion: string;
  empresa?: EmpresaOC;
  destinacionesIT?: string[];  // lista de DestinaciónIT.numero que contienen este insumo
  unidad: string;         // LTS, KG, BULTOS, UNID
  factorKg: number;       // kg por unidad (ej: 25 para bolsas de 25kg, 1 para kg/lts)
  tipo: "Nacional" | "IT" | "IC" | "Muestra";
  grupo: string;          // Ácidos, Sales, etc.
  // Último saldo informado
  stockFisico: number;
  fechaConteo: string;
  // Desglose del stock físico
  enProduccion: number;       // en proceso de producción
  productoTerminado: number;  // en producto terminado
  deposito: number;           // en depósito / almacén
  // MOA / ARCA (según despachante)
  saldoMOA: number;
  unidadMOA: string;          // unidad del saldo MOA (puede diferir de 'unidad', ej: KG vs LTS)
  factorConvMOA?: number;     // factor para convertir unidadMOA → unidad (ej: 0.952 para KG→LTS con densidad 1.05)
  fechaMOA: string;
  // Historial de saldos
  historial: { fecha: string; stockFisico: number; saldoMOA: number; observaciones: string }[];
  observaciones: string;
}

export interface ImportacionComun {
  id: string;
  numero: string;           // N° despacho / factura
  proveedor: string;
  paisOrigen: string;
  descripcion: string;
  valorUSD: number;
  cantidad: number;
  unidad: string;
  fechaEmbarque: string;
  fechaArribo: string;
  fechaNacionalizacion: string;
  estado: "En tránsito" | "En aduana" | "Nacionalizada" | "Cancelada";
  observaciones: string;
}

export interface AccionPlan {
  id: string;
  descripcion: string;
  prioridad: "Alta" | "Media" | "Baja";
  responsable: string;
  fechaCompromiso: string;
  estado: "Pendiente" | "En curso" | "Completada" | "Vencida";
  avance: number;
}

export interface InformeData {
  periodo: string;
  empresa: string;
  responsable: string;
  proveedores: Proveedor[];
  ordenesCompra: OrdenCompra[];
  destinaciones: DestinaciónIT[];
  importacionesComunes: ImportacionComun[];
  insumosStock: InsumoStock[];
  polizas: Poliza[];
  acciones: AccionPlan[];
}

const KEY = "informe_abastecimiento_data";
const API = "/api/abastecimiento";

// Caché en memoria del estado. Se hidrata una vez al cargar la app (hydrateData)
// desde el servidor, de modo que loadData()/saveData() siguen siendo síncronos
// y no hay que tocar la lógica de ninguna página.
let _cache: InformeData | null = null;
let _hydrated = false;

// Aplica todas las migraciones de forma idempotente sobre un blob ya parseado.
function migrate(d: InformeData): InformeData {
  try {
    // Migración: agregar insumosStock si no existe o faltan ítems de material auxiliar
    if (!d.insumosStock || d.insumosStock.length === 0) {
      d.insumosStock = INSUMOS_INICIALES.map((i, idx) => ({ ...i, id: `insumo-${idx}` }));
    } else {
      // Agregar ítems nuevos que no existan aún (por código)
      const codigosExistentes = new Set(d.insumosStock.map(i => i.codigo));
      const nuevos = INSUMOS_INICIALES
        .filter(i => !codigosExistentes.has(i.codigo))
        .map((i, idx) => ({ ...i, id: `insumo-new-${Date.now()}-${idx}` }));
      if (nuevos.length > 0) d.insumosStock = [...d.insumosStock, ...nuevos];
    }
    // Migración: agregar unidadMOA si falta, y cargar saldos MOA del archivo ARCA 29/05/2026
    const moaDefaults: Record<string, { saldoMOA: number; unidadMOA: string; factorConvMOA: number; fechaMOA: string }> = {
      "A00": { saldoMOA: 129767, unidadMOA: "KG", factorConvMOA: 0.952, fechaMOA: "2026-05-29" },
      "A08": { saldoMOA: 3278,   unidadMOA: "KG", factorConvMOA: 1,     fechaMOA: "2026-05-29" },
    };
    // Migración: agregar destinaciones si no existen o faltan nuevas
    if (!d.destinaciones || d.destinaciones.length === 0) {
      d.destinaciones = DESTINACIONES_INICIALES.map((dest, i) => ({ ...dest, id: `dest-${i}` }));
    } else {
      const numerosExistentes = new Set(d.destinaciones.map(x => x.numero));
      const nuevas = DESTINACIONES_INICIALES
        .filter(x => !numerosExistentes.has(x.numero))
        .map((x, i) => ({ ...x, id: `dest-new-${Date.now()}-${i}` }));
      if (nuevas.length > 0) d.destinaciones = [...d.destinaciones, ...nuevas];
      // Migración de campos nuevos en registros existentes
      d.destinaciones = d.destinaciones.map(dest => {
        const migrated: DestinaciónIT = {
          ...dest,
          fechaAltaARCA:   (dest as any).fechaAltaARCA   ?? (dest as any).fechaIngreso ?? "",
          fechaVtoOriginal:(dest as any).fechaVtoOriginal ?? (dest as any).fechaVencimiento ?? "",
          fechaVtoProrroga:(dest as any).fechaVtoProrroga ?? "",
          fechaVencimiento:(dest as any).fechaVencimiento ?? "",
          observaciones:   (dest as any).observaciones   ?? "",
          categoria:       (dest as any).categoria       ?? "",
          codigoProducto:  (dest as any).codigoProducto  ?? "",
          enProduccion:    (dest as any).enProduccion    ?? 0,
          desperdicios:    (dest as any).desperdicios    ?? 0,
          ptSeville:       (dest as any).ptSeville       ?? 0,
          ptTomalar:       (dest as any).ptTomalar       ?? 0,
          estado:          ((dest as any).estado ?? "") as DestinaciónIT["estado"],
          empresa:         (dest as any).empresa ?? ("Seville Cazorla" as EmpresaOC),
        };
        return migrated;
      });
    }

    d.insumosStock = d.insumosStock.map(i => {
      const defaults = INSUMOS_INICIALES.find(x => x.codigo === i.codigo);
      const unidadMOA    = (i as any).unidadMOA    ?? defaults?.unidadMOA    ?? i.unidad;
      const factorConvMOA = (i as any).factorConvMOA ?? defaults?.factorConvMOA ?? 1;
      const moa = moaDefaults[i.codigo];
      if (moa && i.saldoMOA === 0) {
        return { ...i, unidadMOA, factorConvMOA: moa.factorConvMOA, saldoMOA: moa.saldoMOA, fechaMOA: moa.fechaMOA };
      }
      return { ...i, unidadMOA, factorConvMOA, empresa: (i as any).empresa ?? ("Seville Cazorla" as EmpresaOC) };
    });

    // Migración: OC — campos nuevos con defaults
    if (d.ordenesCompra) {
      d.ordenesCompra = d.ordenesCompra.map((o, idx) => ({
        ...o,
        empresa: (o as any).empresa ?? ("Seville Cazorla" as EmpresaOC),
        correlativo: (o as any).correlativo ?? (idx + 1),
        iva: (o as any).iva ?? 21,
        tipoCambio: (o as any).tipoCambio ?? undefined,
        direccionProveedor: (o as any).direccionProveedor ?? "",
        ciudadPaisProveedor: (o as any).ciudadPaisProveedor ?? "",
        numPresupuesto: (o as any).numPresupuesto ?? "",
        fechaPresupuesto: (o as any).fechaPresupuesto ?? "",
        condicionPago: (o as any).condicionPago ?? "",
        lugarEntrega: (o as any).lugarEntrega ?? "",
        presupuestoArchivo: (o as any).presupuestoArchivo ?? undefined,
        facturaArchivo: (o as any).facturaArchivo ?? undefined,
        comprobantePagoArchivo: (o as any).comprobantePagoArchivo ?? undefined,
        remitosArchivos: (o as any).remitosArchivos ?? [],
      }));
    }

    // Migración: proveedores — agregar campo documentos si falta
    if (!d.proveedores) d.proveedores = [];
    d.proveedores = d.proveedores.map(p => ({
      ...p,
      documentos: (p as any).documentos ?? [],
      empresa:    (p as any).empresa    ?? ("Seville Cazorla" as EmpresaOC),
    }));

    // Migración: pólizas — agregar campos nuevos si faltan
    if (!d.polizas) d.polizas = [];
    d.polizas = d.polizas.map(p => ({
      ...p,
      destinacionesVinculadas: (p as any).destinacionesVinculadas ?? [],
      tipo:             (p as any).tipo             ?? "Caución" as const,
      montoGarantiaARS: (p as any).montoGarantiaARS ?? 0,
      montoGarantiaUSD: (p as any).montoGarantiaUSD ?? (p as any).montoARS ?? 0,
      primaARS:         (p as any).primaARS         ?? 0,
      fechaGestion:     (p as any).fechaGestion     ?? "",
      motivoBaja:       (p as any).motivoBaja       ?? "" as const,
      estado:           ((p as any).estado === "Vigente" ? "Activa" : (p as any).estado ?? "Activa") as Poliza["estado"],
    }));

    return d;
  } catch {
    return defaultData();
  }
}

// Parsea un string crudo (o null) y aplica migraciones; cae a defaultData.
function parseOrDefault(raw: string | null): InformeData {
  if (!raw) return migrate(defaultData());
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return migrate(defaultData());
  }
}

// Síncrono: devuelve el caché ya hidratado. Si todavía no se hidrató (raro,
// porque el layout espera la hidratación), cae a localStorage o a defaultData.
export function loadData(): InformeData {
  if (_cache) return _cache;
  if (typeof window === "undefined") return defaultData();
  _cache = parseOrDefault(localStorage.getItem(KEY));
  return _cache;
}

// Guarda en el caché, espeja a localStorage (offline) y persiste en el servidor.
export function saveData(data: InformeData) {
  _cache = data;
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* quota */ }
  fetch(API, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => { /* offline: queda el espejo en localStorage */ });
}

// Hidrata el caché desde el servidor una sola vez. El layout la espera antes
// de renderizar las páginas, así loadData() ya tiene los datos del servidor.
export async function hydrateData(): Promise<void> {
  if (_hydrated) return;
  _hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const res = await fetch(API);
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        _cache = migrate(json.data);
        try { localStorage.setItem(KEY, JSON.stringify(_cache)); } catch { /* quota */ }
        return;
      }
    }
    // Servidor vacío (primera vez). Para no pisar datos de otra PC, solo subimos
    // al servidor si ESTE navegador tiene datos reales guardados. Un navegador
    // vacío usa defaults en memoria sin tocar el servidor.
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const seeded = parseOrDefault(raw);
      saveData(seeded); // sube los datos reales de este navegador al servidor
    } else {
      _cache = migrate(defaultData());
    }
  } catch {
    // Sin conexión al servidor: usar el espejo local.
    _cache = parseOrDefault(localStorage.getItem(KEY));
  }
}

export function vencimientoEfectivo(dest: DestinaciónIT): string {
  return dest.fechaVtoProrroga || dest.fechaVtoOriginal;
}

export function getPolizaDeDestinacion(destNumero: string, polizas: Poliza[]): Poliza | undefined {
  return polizas.find(p => p.destinacionesVinculadas.includes(destNumero));
}

export const INSUMOS_INICIALES: Omit<InsumoStock, "id">[] = [
  // ── ÁCIDOS ──
  // A00: tipo IT (ingresó como IT), MOA en KG (3 destinaciones neto al 29/05/2026 descontando consumos): 31904 + 55063 + 42800 = 129767 KG. Stock físico en LTS (unidad distinta — MOA de ARCA en KG)
  { codigo:"A00", descripcion:"ÁCIDO ACÉTICO",             unidad:"LTS",    factorKg:1,  tipo:"IT",       grupo:"Ácidos",                 stockFisico:16000, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:16000, saldoMOA:129767, unidadMOA:"KG", factorConvMOA:0.952, fechaMOA:"2026-05-29", historial:[], observaciones:"Saldo MOA en KG — factor conv. 0.952 (KG÷1.05≈LTS, densidad AA 80%)" },
  { codigo:"A01", descripcion:"ÁCIDO CÍTRICO (25KG)",       unidad:"BULTOS", factorKg:25, tipo:"IT",       grupo:"Ácidos",                 stockFisico:400,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:400,   saldoMOA:0, unidadMOA:"BULTOS", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A02", descripcion:"ÁCIDO CLORHÍDRICO",          unidad:"LTS",    factorKg:1,  tipo:"IT",       grupo:"Ácidos",                 stockFisico:500,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:500,   saldoMOA:0, unidadMOA:"LTS",    factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A03", descripcion:"ÁCIDO LÁCTICO",              unidad:"LTS",    factorKg:1,  tipo:"IT",       grupo:"Ácidos",                 stockFisico:17000, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:17000, saldoMOA:0, unidadMOA:"LTS",    factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  // ── GOMAS / ESPESANTES ──
  { codigo:"A04", descripcion:"ALGUINATO SÓDICO LTHGS (25KG)", unidad:"BULTOS", factorKg:25, tipo:"IT",   grupo:"Gomas / Espesantes",     stockFisico:6,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:6,     saldoMOA:0, unidadMOA:"BULTOS", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A05", descripcion:"ALGUINATO SÓDICO MV40 (25KG)",  unidad:"BULTOS", factorKg:25, tipo:"IT",   grupo:"Gomas / Espesantes",     stockFisico:14,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:14,    saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A09", descripcion:"GUAR GUM (25KG)",            unidad:"BULTOS", factorKg:25, tipo:"IT",       grupo:"Gomas / Espesantes",     stockFisico:20,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:20,    saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A20", descripcion:"XANTHANA GUM (25KG)",         unidad:"BULTOS", factorKg:25, tipo:"IT",      grupo:"Gomas / Espesantes",     stockFisico:13,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:13,    saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  // ── ÁLCALIS ──
  { codigo:"A17", descripcion:"SODA (NaOH)",                unidad:"LTS",    factorKg:1,  tipo:"Nacional", grupo:"Álcalis",               stockFisico:96000, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:96000, saldoMOA:0, unidadMOA:"LTS",    factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A06", descripcion:"BICARBONATO (25KG)",          unidad:"BULTOS", factorKg:25, tipo:"Nacional", grupo:"Álcalis",               stockFisico:0,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:0,     saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  // ── SALES ──
  { codigo:"A16", descripcion:"SAL GRUESA A GRANEL",         unidad:"KG",     factorKg:1,  tipo:"Nacional", grupo:"Sales",                 stockFisico:0,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:0,     saldoMOA:0, unidadMOA:"KG",     factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"Sin dato en último conteo" },
  { codigo:"A14", descripcion:"SAL GRUESA (25KG)",            unidad:"BULTOS", factorKg:25, tipo:"Nacional", grupo:"Sales",                 stockFisico:798,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:798,   saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A15", descripcion:"SAL GRUESA (50KG)",            unidad:"BULTOS", factorKg:50, tipo:"Nacional", grupo:"Sales",                 stockFisico:0,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:0,     saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A12", descripcion:"SAL ENTREFINA (25KG)",         unidad:"BULTOS", factorKg:25, tipo:"Nacional", grupo:"Sales",                 stockFisico:311,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:311,   saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A13", descripcion:"SAL ENTREFINA (50KG)",         unidad:"BULTOS", factorKg:50, tipo:"Nacional", grupo:"Sales",                 stockFisico:0,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:0,     saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A24", descripcion:"SAL FINA",                    unidad:"KG",     factorKg:1,  tipo:"Nacional", grupo:"Sales",                 stockFisico:8,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:8,     saldoMOA:0, unidadMOA:"KG",     factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  // ── SULFATOS / MINERALES ──
  { codigo:"A07", descripcion:"CLORURO DE CALCIO (25KG)",    unidad:"BULTOS", factorKg:25, tipo:"IT",       grupo:"Sulfatos / Minerales",  stockFisico:47,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:47,    saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A18", descripcion:"SULFATO DE COBRE (25KG)",     unidad:"BULTOS", factorKg:25, tipo:"IT",       grupo:"Sulfatos / Minerales",  stockFisico:3,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:3,     saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A19", descripcion:"SULFATO FERROSO (25KG)",      unidad:"BULTOS", factorKg:25, tipo:"IT",       grupo:"Sulfatos / Minerales",  stockFisico:9,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:9,     saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A25", descripcion:"SULFATO DE CINC (25KG)",      unidad:"BULTOS", factorKg:25, tipo:"IT",       grupo:"Sulfatos / Minerales",  stockFisico:4,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:4,     saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  // ── ADITIVOS / CONSERVANTES ──
  // A08: Gluconato Ferroso — MOA neto al 29/05/2026 descontando consumos informados: 3278.40 KG (1 destinación 26079IT15000001H)
  { codigo:"A08", descripcion:"GLUCONATO",                   unidad:"KG",     factorKg:1,  tipo:"IT",       grupo:"Aditivos / Conservantes", stockFisico:216,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:216,   saldoMOA:3278, unidadMOA:"KG", factorConvMOA:1, fechaMOA:"2026-05-29", historial:[], observaciones:"Dest. 26079IT15000001H — saldo neto descontando consumos informados" },
  { codigo:"A10", descripcion:"METABISULFITO (25KG)",        unidad:"BULTOS", factorKg:25, tipo:"IT",       grupo:"Aditivos / Conservantes", stockFisico:13,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:13,    saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A11", descripcion:"PIMENTÓN (25KG)",             unidad:"BULTOS", factorKg:25, tipo:"Nacional", grupo:"Aditivos / Conservantes", stockFisico:3,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:3,     saldoMOA:0, unidadMOA:"BULTOS", fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A21", descripcion:"ORÉGANO",                     unidad:"KG",     factorKg:1,  tipo:"Nacional", grupo:"Aditivos / Conservantes", stockFisico:71,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:71,    saldoMOA:0, unidadMOA:"KG",     factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A22", descripcion:"AJÍ MOLIDO",                  unidad:"KG",     factorKg:1,  tipo:"Nacional", grupo:"Aditivos / Conservantes", stockFisico:3,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:3,     saldoMOA:0, unidadMOA:"KG",     factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"A23", descripcion:"PIMIENTA NEGRA MOLIDA",       unidad:"KG",     factorKg:1,  tipo:"Nacional", grupo:"Aditivos / Conservantes", stockFisico:1,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:1,     saldoMOA:0, unidadMOA:"KG",     factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  // ══════════════════════════════════════════════
  // MATERIAL AUXILIAR (Hoja 2 — Stock de Insumos)
  // ══════════════════════════════════════════════
  // ── CAJAS / SEPARADORES ──
  { codigo:"PMP",      descripcion:"CAJAS METÁLICAS",                unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Cajas y Separadores", stockFisico:370,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:370,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"PRENSADO", descripcion:"FENÓLICO PRENSADO",               unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Cajas y Separadores", stockFisico:0,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:0,    saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"1274549",  descripcion:"SEPARADORES DE 12 (NAC)",         unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Cajas y Separadores", stockFisico:6900, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:6900, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"1274547",  descripcion:"CAJAS X12 (NAC)",                 unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Cajas y Separadores", stockFisico:4623, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:4623, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"1261284",  descripcion:"CAJAS DE 10 (NAC)",               unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Cajas y Separadores", stockFisico:3205, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:3205, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"CAJROYBLNC",descripcion:"CAJA ROYALTY BLANCA",            unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Cajas y Separadores", stockFisico:180,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:180,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"44541",    descripcion:"SEPARADORES DE 12 (IT)",          unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Cajas y Separadores", stockFisico:0,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:0,    saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"77040",    descripcion:"SEPARADORES DE 10 (IT)",          unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Cajas y Separadores", stockFisico:9020, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:9020, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"44540",    descripcion:"CAJAS DE 12 (IT)",                unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Cajas y Separadores", stockFisico:0,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:0,    saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"73007",    descripcion:"CAJAS DE 10 (IT)",                unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Cajas y Separadores", stockFisico:0,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:0,    saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  // ── BOLSAS ──
  { codigo:"SAMAFRAVA", descripcion:"BOLSAS ANÓNIMA 3 SOLDADURAS (IT)", unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Bolsas", stockFisico:554591, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:554591, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"BOLTRESSOL",descripcion:"BOLSAS TRES SOLDADURAS (IT)",       unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Bolsas", stockFisico:90000,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:90000,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"67450",    descripcion:"BOLSAS AMCOR PORTUGAL (IT)",         unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Bolsas", stockFisico:294000, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:294000, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"BOLUNI",   descripcion:"BOLSAS UNIVERSAL",                   unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Bolsas", stockFisico:116600, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:116600, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"BOLMILL",  descripcion:"BOLSAS MILLER",                      unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Bolsas", stockFisico:50700,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:50700,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"BOLHPM",   descripcion:"BOLSAS HPM",                         unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Bolsas", stockFisico:9600,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:9600,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"AMCOR-NAC",descripcion:"BOLSAS AMCOR PORTUGAL (NAC)",        unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Bolsas", stockFisico:60000,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:60000,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"78429",    descripcion:"BIG BOX (RAFIA) (IT)",               unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Bolsas", stockFisico:1540,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:1540,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"78428",    descripcion:"BAG IN BOX (IT)",                    unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Bolsas", stockFisico:1836,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:1836,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  // ── ETIQUETAS ──
  { codigo:"ET102X202",     descripcion:"ETIQUETA 102X202",                    unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:3,      fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:3,      saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"ET25X50",       descripcion:"ETIQUETA 25X50",                      unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:34,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:34,     saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"ET100X238",     descripcion:"ETIQUETA 100X238",                    unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:32,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:32,     saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"ET100X150",     descripcion:"ETIQUETA 100X150",                    unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:52,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:52,     saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"ET100X50",      descripcion:"ETIQUETA 100X50",                     unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:21,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:21,     saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"ET10X10",       descripcion:"ETIQUETA 10X10",                      unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:61,     fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:61,     saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"DELDESTINOCAJA",descripcion:"ETIQUETAS DEL DESTINO CAJA",          unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:2800,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:2800,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"41255",         descripcion:"ETIQUETAS AGRO USA NDH",              unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:5300,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:5300,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"40734",         descripcion:"ETIQUETAS AGRO USA NRD",              unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:129840, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:129840, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"43384",         descripcion:"ETIQUETAS MONTANEJO VEDH",            unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:63050,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:63050,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"43385",         descripcion:"ETIQUETAS MONTANEJO VENT",            unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:12450,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:12450,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"43382",         descripcion:"ETIQUETAS MONTANEJO NENT",            unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:12200,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:12200,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"43381",         descripcion:"ETIQUETAS MONTANEJO NRD",             unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:56830,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:56830,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"43383",         descripcion:"ETIQUETAS MONTANEJO NDH",             unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:12750,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:12750,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"TELEPIZZAAC1",  descripcion:"ETIQUETAS TELEPIZZA CHILE",           unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:7000,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:7000,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"TELEPIZZAAC2",  descripcion:"ETIQUETAS TELEPIZZA CHILE CAJA",      unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:31100,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:31100,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"TELEHONDURACAJA",descripcion:"ETIQUETAS TELEPIZZA HONDURA CAJA",   unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:0,      fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:0,      saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"48822",         descripcion:"ETIQUETAS TELEPIZZA HONDURA (IT)",    unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Etiquetas", stockFisico:3200,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:3200,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"AGROSEVILLAADHEP",descripcion:"ETIQUETAS AGRO SEVILLA ADHEPEL",   unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:2500,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:2500,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"MAIFREND",      descripcion:"ETIQUETAS MAIFRE N DH",              unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:500,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:500,    saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"EMPRESCAJA",    descripcion:"ETIQUETAS EMPRES CAJA",              unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:3200,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:3200,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"78940",         descripcion:"ETIQUETAS EMPRES RD",                unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:25200,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:25200,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"41193",         descripcion:"ETIQUETAS VALLE DE CHILE RD",        unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:5600,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:5600,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"42288",         descripcion:"ETIQUETAS EL BUHO DH",               unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:18350,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:18350,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"42153",         descripcion:"ETIQUETAS EL BUHO RD",               unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:59000,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:59000,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"44542NAC",      descripcion:"ETIQUETAS ROYALTY (NAC)",             unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:657,    fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:657,    saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"44543",         descripcion:"ETIQUETAS SOL DE AZAPA DH (IT)",      unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Etiquetas", stockFisico:43350,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:43350,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"44586",         descripcion:"ETIQUETAS SOL DE AZAPA RD (IT)",      unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Etiquetas", stockFisico:1500,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:1500,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"77372",         descripcion:"ETIQUETAS RONSON BLACK (IT)",         unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Etiquetas", stockFisico:87900,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:87900,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"78112",         descripcion:"ETIQUETAS RONSON GREEN",              unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Etiquetas", stockFisico:72400,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:72400,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"41860",         descripcion:"ETIQUETAS SUBWAY CAJAS (IT)",         unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Etiquetas", stockFisico:0,      fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:0,      saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"41859",         descripcion:"ETIQUETAS SUBWAY BOLSAS (IT)",        unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Etiquetas", stockFisico:110800, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:110800, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"42570",         descripcion:"ETIQUETAS DEL DESTINO (IT)",          unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Etiquetas", stockFisico:188084, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:188084, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"67402",         descripcion:"ETIQUETAS WESTSIDE (IT)",             unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Etiquetas", stockFisico:100050, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:100050, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"67338",         descripcion:"ETIQUETAS PIZZA FACTORY (IT)",        unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Etiquetas", stockFisico:152100, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:152100, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"77488",         descripcion:"ETIQUETAS PAMPA CAJAS (IT)",          unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Etiquetas", stockFisico:3000,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:3000,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"77505",         descripcion:"ETIQUETAS PAMPA BOLSA (IT)",          unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Etiquetas", stockFisico:129900, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:129900, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"44542",         descripcion:"ETIQUETAS ROYALTY (IT)",              unidad:"UNID", factorKg:1, tipo:"IT",       grupo:"Etiquetas", stockFisico:383700, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:383700, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  // ── EMBALAJE / FILM ──
  { codigo:"CERARES",  descripcion:"CERA RESINA",                  unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Embalaje", stockFisico:2,   fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:2,   saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"TDP6",     descripcion:"RIBBON 110MM×450M",             unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Embalaje", stockFisico:23,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:23,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"TDX7",     descripcion:"RIBBON 110MM×450M (alt)",       unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Embalaje", stockFisico:19,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:19,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"CINTACHICA",descripcion:"CINTA PARA EMBALAR",           unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Embalaje", stockFisico:613, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:613, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"CINTAGRANDE",descripcion:"CINTA PARA ENCINTADORA",      unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Embalaje", stockFisico:46,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:46,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"FILMSTH",  descripcion:"FILM STRETCH",                  unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Embalaje", stockFisico:336, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:336, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"4091",     descripcion:"CARTOPALLET",                   unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Embalaje", stockFisico:183, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:183, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  // ── PALLETS ──
  { codigo:"PALLETAZUL",descripcion:"PALLET AZUL",                  unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Pallets", stockFisico:33,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:33,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"PALFUMCHPS",descripcion:"PALLET FUMIGADO",              unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Pallets", stockFisico:71,  fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:71,  saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
  { codigo:"3684",     descripcion:"PALLET",                        unidad:"UNID", factorKg:1, tipo:"Nacional", grupo:"Pallets", stockFisico:155, fechaConteo:"2025-06-10", enProduccion:0, productoTerminado:0, deposito:155, saldoMOA:0, unidadMOA:"UNID", factorConvMOA:1, fechaMOA:"", historial:[], observaciones:"" },
];

// ─────────────────────────────────────────────────────────────────
// DESTINACIONES IT — datos reales del archivo SALDO MOA 29-05-2026
// Fuente: col 8=Fecha Alta ARCA, col 9=Vto.Actual, col 10=Vto.Original,
//         col 11=Vto.Prórroga, col 22=Saldo MOA (despachante: CARLOS ARNOBIO HERRERA)
// ─────────────────────────────────────────────────────────────────
export const DESTINACIONES_INICIALES: Omit<DestinaciónIT, "id">[] = [
  // ── BOLSAS TRES SOLDADURAS ──
  {
    numero:"24079IT15000002G", descripcion:"BOLSAS TRES SOLDADURAS ANÓNIMAS",
    categoria:"BOLSAS", codigoProducto:"67450",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2024-11-11",
    fechaVtoOriginal:"2025-11-08", fechaVtoProrroga:"2026-11-03", fechaVencimiento:"2026-11-03",
    stockDocumental:44120, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"Prórroga otorgada",
    observaciones:"También incluye ETIQUETA POUCH 936 GRS (13.310 ud) y CAJA X12 POUCH (saldo 0)"
  },
  {
    numero:"25001IT14001992K", descripcion:"BOLSAS TRES SOLDADURAS ANÓNIMAS",
    categoria:"BOLSAS", codigoProducto:"67450",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2025-06-17",
    fechaVtoOriginal:"2026-06-16", fechaVtoProrroga:"", fechaVencimiento:"2026-06-16",
    stockDocumental:265680, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"Prórroga solicitada",
    observaciones:"Póliza 964067 / 25001007944Y — Garantía $132.000.000 ARS"
  },
  {
    numero:"25079IT15000002H", descripcion:"BOLSAS TRES SOLDADURAS ANÓNIMAS",
    categoria:"BOLSAS", codigoProducto:"67450",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2025-08-25",
    fechaVtoOriginal:"2026-08-21", fechaVtoProrroga:"", fechaVencimiento:"2026-08-21",
    stockDocumental:2182, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"Próxima a vencer",
    observaciones:"Póliza 971152 / 25079000004J"
  },
  {
    numero:"25079IT15000007M", descripcion:"BOLSAS TRES SOLDADURAS ANÓNIMAS",
    categoria:"BOLSAS", codigoProducto:"67450",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2025-11-26",
    fechaVtoOriginal:"2026-11-23", fechaVtoProrroga:"", fechaVencimiento:"2026-11-23",
    stockDocumental:90000, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"",
    observaciones:"Póliza 981416 — Garantía $23.500.000 ARS"
  },
  {
    numero:"26001IT14001229E", descripcion:"BOLSAS TRES SOLDADURAS ANÓNIMAS",
    categoria:"BOLSAS", codigoProducto:"67450",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2026-04-21",
    fechaVtoOriginal:"2027-04-18", fechaVtoProrroga:"", fechaVencimiento:"2027-04-18",
    stockDocumental:591000, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"",
    observaciones:"FACT N° E-2026-0003"
  },
  {
    numero:"26079IT15000002X", descripcion:"BOLSAS TRES SOLDADURAS ANÓNIMAS",
    categoria:"BOLSAS", codigoProducto:"67450",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2026-01-26",
    fechaVtoOriginal:"2027-01-23", fechaVtoProrroga:"", fechaVencimiento:"2027-01-23",
    stockDocumental:184500, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"", observaciones:""
  },
  {
    numero:"26079IT15000003J", descripcion:"BOLSAS TRES SOLDADURAS ANÓNIMAS",
    categoria:"BOLSAS", codigoProducto:"67450",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2026-04-06",
    fechaVtoOriginal:"2027-04-02", fechaVtoProrroga:"", fechaVencimiento:"2027-04-02",
    stockDocumental:1833, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"", observaciones:"FACT N° E-2026-0001"
  },
  // ── ETIQUETA POUCH 936 GRS ──
  {
    numero:"24079IT15000002G-ET", descripcion:"ETIQUETA POUCH 936 GRS",
    categoria:"ETIQUETAS", codigoProducto:"44542",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2024-11-11",
    fechaVtoOriginal:"2025-11-08", fechaVtoProrroga:"2026-11-03", fechaVencimiento:"2026-11-03",
    stockDocumental:13310, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"Prórroga otorgada", observaciones:"Dentro de la destinación 24079IT15000002G"
  },
  {
    numero:"25079IT15000005K", descripcion:"ETIQUETA POUCH 936 GRS",
    categoria:"ETIQUETAS", codigoProducto:"44542",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2025-11-25",
    fechaVtoOriginal:"2026-11-23", fechaVtoProrroga:"", fechaVencimiento:"2026-11-23",
    stockDocumental:68540, stockFisico:68540, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"", observaciones:""
  },
  {
    numero:"25079IT15000006L", descripcion:"ETIQUETA POUCH 936 GRS",
    categoria:"ETIQUETAS", codigoProducto:"42570",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2025-11-25",
    fechaVtoOriginal:"2026-11-23", fechaVtoProrroga:"", fechaVencimiento:"2026-11-23",
    stockDocumental:171600, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"", observaciones:""
  },
  {
    numero:"26079IT15000004K", descripcion:"ETIQUETA POUCH 936 GRS",
    categoria:"ETIQUETAS", codigoProducto:"44542",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2026-04-06",
    fechaVtoOriginal:"2027-04-02", fechaVtoProrroga:"", fechaVencimiento:"2027-04-02",
    stockDocumental:312000, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"", observaciones:"FACT N° E-2026-0002"
  },
  // ── CAJAS METÁLICAS ──
  {
    numero:"25079IT05000002G", descripcion:"CAJAS METÁLICAS P/TRAN. ACEITUNAS",
    categoria:"CAJAS METÁLICAS", codigoProducto:"PMP",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2025-02-17",
    fechaVtoOriginal:"2025-10-17", fechaVtoProrroga:"", fechaVencimiento:"2026-06-14",
    stockDocumental:0, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"Con solicitud de baja",
    observaciones:"Saldo 0 — póliza con solicitud de baja"
  },
  {
    numero:"25079IT05000003H", descripcion:"CAJAS METÁLICAS P/TRAN. ACEITUNAS",
    categoria:"CAJAS METÁLICAS", codigoProducto:"PMP",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2025-11-25",
    fechaVtoOriginal:"2026-07-26", fechaVtoProrroga:"", fechaVencimiento:"2026-07-26",
    stockDocumental:0, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"Solicitar Baja",
    observaciones:"Saldo 0 — Póliza 980589 ($6.100.000 ARS). Solicitar baja."
  },
  {
    numero:"26001IT04000047A", descripcion:"CAJAS METÁLICAS P/TRAN. ACEITUNAS",
    categoria:"CAJAS METÁLICAS", codigoProducto:"PMP",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2026-04-20",
    fechaVtoOriginal:"2026-12-19", fechaVtoProrroga:"", fechaVencimiento:"2026-12-19",
    stockDocumental:0, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"", observaciones:"PROF N° 02"
  },
  {
    numero:"26079IT05000001G", descripcion:"CAJAS METÁLICAS P/TRAN. ACEITUNAS",
    categoria:"CAJAS METÁLICAS", codigoProducto:"PMP",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2026-04-06",
    fechaVtoOriginal:"2026-12-03", fechaVtoProrroga:"", fechaVencimiento:"2026-12-03",
    stockDocumental:0, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"", observaciones:"PROF N° 01"
  },
  {
    numero:"26079IT05000002H", descripcion:"CAJAS METÁLICAS P/TRAN. ACEITUNAS",
    categoria:"CAJAS METÁLICAS", codigoProducto:"PMP",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2026-05-22",
    fechaVtoOriginal:"2027-01-22", fechaVtoProrroga:"", fechaVencimiento:"2027-01-22",
    stockDocumental:6, stockFisico:6, enProduccion:0, desperdicios:135, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"", observaciones:"Ingresaron 141 — consumo 135 — saldo 6. PROF N° 03"
  },
  // ── INSUMOS QUÍMICOS ──
  {
    numero:"26001IT14000278H", descripcion:"ÁCIDO ACÉTICO 80%",
    categoria:"INSUMOS QUÍMICOS", codigoProducto:"A00",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2026-01-26",
    fechaVtoOriginal:"2027-01-25", fechaVtoProrroga:"", fechaVencimiento:"2027-01-25",
    stockDocumental:31904, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"KG", estado:"",
    observaciones:"Saldo neto consumos descontados. MOA original 42.581 KG. FACT N° 2025-65"
  },
  {
    numero:"26001IT14000305V", descripcion:"ÁCIDO ACÉTICO 80%",
    categoria:"INSUMOS QUÍMICOS", codigoProducto:"A00",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2026-01-28",
    fechaVtoOriginal:"2027-01-28", fechaVtoProrroga:"", fechaVencimiento:"2027-01-28",
    stockDocumental:55063, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"KG", estado:"",
    observaciones:"Póliza 987521 / 26001000934H — Garantía $55.000.000 ARS"
  },
  {
    numero:"26001IT14000310R", descripcion:"ÁCIDO ACÉTICO 80%",
    categoria:"INSUMOS QUÍMICOS", codigoProducto:"A00",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2026-01-28",
    fechaVtoOriginal:"2027-01-28", fechaVtoProrroga:"", fechaVencimiento:"2027-01-28",
    stockDocumental:42800, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"KG", estado:"", observaciones:""
  },
  {
    numero:"26079IT15000001H", descripcion:"GLUCONATO FERROSO",
    categoria:"INSUMOS QUÍMICOS", codigoProducto:"A08",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2026-01-26",
    fechaVtoOriginal:"2027-01-22", fechaVtoProrroga:"", fechaVencimiento:"2027-01-22",
    stockDocumental:3278, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"KG", estado:"", observaciones:"Saldo neto. MOA original 3.356 KG. FACT N° 2025-55"
  },
  // ── DESTINACIONES HISTÓRICAS / SIN SALDO ──
  {
    numero:"22001IT04000043P", descripcion:"CAJAS METÁLICAS (GOODPACKS)",
    categoria:"CAJAS METÁLICAS", codigoProducto:"PMP",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2022-03-11",
    fechaVtoOriginal:"", fechaVtoProrroga:"", fechaVencimiento:"",
    stockDocumental:0, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"Con solicitud de baja",
    observaciones:"Póliza 821339 — CON SOLICITUD DE BAJA"
  },
  {
    numero:"24079IT05000007K", descripcion:"CAJAS METÁLICAS P/TRAN. ACEITUNAS",
    categoria:"CAJAS METÁLICAS", codigoProducto:"PMP",
    proveedor:"", precioUnitarioUSD:0, valorUSD:0,
    fechaAltaARCA:"2024-12-12",
    fechaVtoOriginal:"", fechaVtoProrroga:"", fechaVencimiento:"",
    stockDocumental:0, stockFisico:0, enProduccion:0, desperdicios:0, ptSeville:0, ptTomalar:0,
    unidad:"UNID", estado:"Sin info", observaciones:"Sin fecha de vencimiento"
  },
];

function defaultData(): InformeData {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  return {
    periodo: `${hoy.getFullYear()}-${mes}`,
    empresa: "Seville Cazorla",
    responsable: "",
    proveedores: [
      {
        id: "prov-ejemplo-1",
        codigo: "PRV-0001",
        razonSocial: "Química del Sur S.A.",
        empresa: "Seville Cazorla" as EmpresaOC,
        tipo: "Nacional" as const,
        categorias: ["Químicos", "Ácidos"],
        pais: "Argentina",
        contacto: "Ing. Martín Álvarez",
        email: "malvarez@quimicadelsur.com.ar",
        telefono: "+54 261 4523-800",
        cuit: "30-71234567-8",
        condicionPago: "30 días fecha factura",
        moneda: "ARS" as const,
        plazoEntregaDias: 7,
        calificacion: 5 as const,
        homologado: true,
        fechaHomologacion: "2024-03-15",
        vencimientoHomologacion: "2026-03-15",
        numeroHomologacion: "HOM-2024-001",
        activo: true,
        observaciones: "Proveedor principal de ácido acético y soda cáustica. Certificado ISO 9001.",
        cotizaciones: [],
        preciosNegociados: [],
        documentos: [],
      }
    ],
    ordenesCompra: [],
    destinaciones: DESTINACIONES_INICIALES.map((d, i) => ({ ...d, id: `dest-${i}` })),
    importacionesComunes: [],
    insumosStock: INSUMOS_INICIALES.map((i, idx) => ({ ...i, id: `insumo-${idx}` })),
    polizas: [
      { id:"pol-1", numero:"964067", aseguradora:"25001007944Y", tipo:"Caución" as const, destinacionesVinculadas:["25001IT14001992K"], montoGarantiaARS:132000000, montoGarantiaUSD:0, primaARS:0, fechaEmision:"2025-06-17", fechaVencimiento:"2026-06-16", fechaGestion:"", estado:"Activa" as const, motivoBaja:"" as const, observaciones:"BOLSAS TRES SOLDADURAS — saldo 265.680 ud" },
      { id:"pol-2", numero:"980589", aseguradora:"", tipo:"Caución" as const, destinacionesVinculadas:["25079IT05000003H"], montoGarantiaARS:6100000, montoGarantiaUSD:0, primaARS:0, fechaEmision:"2025-11-25", fechaVencimiento:"2026-07-26", fechaGestion:"", estado:"Activa" as const, motivoBaja:"" as const, observaciones:"CAJAS METÁLICAS — saldo 0. Solicitar baja." },
      { id:"pol-3", numero:"971152", aseguradora:"25079000004J", tipo:"Caución" as const, destinacionesVinculadas:["25079IT15000002H"], montoGarantiaARS:0, montoGarantiaUSD:0, primaARS:46455.74, fechaEmision:"2025-08-25", fechaVencimiento:"2026-08-21", fechaGestion:"", estado:"Activa" as const, motivoBaja:"" as const, observaciones:"BOLSAS TRES SOLDADURAS — próxima a vencer" },
      { id:"pol-4", numero:"981416", aseguradora:"", tipo:"Caución" as const, destinacionesVinculadas:["25079IT15000007M"], montoGarantiaARS:23500000, montoGarantiaUSD:0, primaARS:126267.63, fechaEmision:"2025-11-26", fechaVencimiento:"2026-11-23", fechaGestion:"", estado:"Activa" as const, motivoBaja:"" as const, observaciones:"BOLSAS TRES SOLDADURAS — saldo 90.000 ud" },
      { id:"pol-5", numero:"987521", aseguradora:"26001000934H", tipo:"Caución" as const, destinacionesVinculadas:["26001IT14000305V"], montoGarantiaARS:55000000, montoGarantiaUSD:0, primaARS:54225, fechaEmision:"2026-01-28", fechaVencimiento:"2027-01-28", fechaGestion:"", estado:"Activa" as const, motivoBaja:"" as const, observaciones:"ÁCIDO ACÉTICO 80% — saldo 55.063 KG" },
      { id:"pol-6", numero:"821339", aseguradora:"", tipo:"Caución" as const, destinacionesVinculadas:["22001IT04000043P"], montoGarantiaARS:0, montoGarantiaUSD:0, primaARS:0, fechaEmision:"2022-03-11", fechaVencimiento:"", fechaGestion:"", estado:"Baja solicitada" as const, motivoBaja:"Saldo agotado" as const, observaciones:"CAJAS METÁLICAS (GOODPACKS) — CON SOLICITUD DE BAJA" },
    ],
    acciones: [],
  };
}

// ── Helpers BRCGS ──────────────────────────────────────────────────────────────

export function estadoDocumento(doc: DocumentoProveedor): EstadoDocumento {
  if (!doc.archivo && !doc.fechaVencimiento && !doc.fechaEmision) return "pendiente";
  if (!doc.fechaVencimiento) return doc.archivo ? "vigente" : "pendiente";
  const dias = Math.round((new Date(doc.fechaVencimiento).getTime() - Date.now()) / 86400000);
  if (dias < 0) return "vencido";
  if (dias <= 60) return "por_vencer";
  return "vigente";
}

export type TipoInsumo =
  | "quimico" | "lubricante" | "reactivo" | "contacto_alimento"
  | "auxiliar_sin_contacto" | "servicio" | "materia_prima" | "otro";

const BASE: Omit<DocumentoProveedor, "id">[] = [
  { nombre: "Cuestionario de homologación firmado",     nivel: "obligatorio" },
  { nombre: "Habilitación SENASA / ANMAT vigente",      nivel: "obligatorio" },
  { nombre: "ISO 9001 vigente o justificación",         nivel: "obligatorio" },
  { nombre: "Ficha técnica del producto/servicio",      nivel: "obligatorio" },
  { nombre: "Constancia de inscripción impositiva (AFIP)", nivel: "obligatorio" },
];

const DOCS_POR_TIPO: Record<TipoInsumo, Omit<DocumentoProveedor, "id">[]> = {
  quimico: [
    { nombre: "FDS/SDS (Ficha de Datos de Seguridad GHS/SGA)", nivel: "obligatorio" },
    { nombre: "Declaración de aptitud para industria alimentaria", nivel: "obligatorio" },
    { nombre: "Certificado NSF A1/A2/A4",                        nivel: "obligatorio" },
    { nombre: "Certificado de composición sin sustancias prohibidas", nivel: "obligatorio" },
    { nombre: "Protocolo de análisis por lote (CoA)",            nivel: "recomendado" },
    { nombre: "Registro ANMAT/SENASA del producto",              nivel: "recomendado" },
    { nombre: "ISO 9001 del fabricante (si proveedor es distribuidor)", nivel: "complementario" },
  ],
  lubricante: [
    { nombre: "FDS/SDS actualizada",                             nivel: "obligatorio" },
    { nombre: "Certificación NSF H1 (grado alimentario)",        nivel: "obligatorio" },
    { nombre: "Declaración de ausencia de componentes tóxicos",  nivel: "obligatorio" },
    { nombre: "ISO 21469",                                       nivel: "recomendado" },
    { nombre: "Ficha técnica con temperatura y condiciones de aplicación", nivel: "recomendado" },
  ],
  reactivo: [
    { nombre: "Certificado de análisis (CoA) con número CAS",    nivel: "obligatorio" },
    { nombre: "FDS/SDS del reactivo",                            nivel: "obligatorio" },
    { nombre: "Grado declarado (PA, ACS, USP, etc.)",            nivel: "obligatorio" },
    { nombre: "ISO/IEC 17025 del laboratorio proveedor",         nivel: "recomendado" },
    { nombre: "Certificado de esterilidad y desempeño del lote", nivel: "recomendado" },
    { nombre: "Trazabilidad del fabricante de origen",           nivel: "complementario" },
  ],
  contacto_alimento: [
    { nombre: "Declaración de conformidad para contacto con alimentos", nivel: "obligatorio" },
    { nombre: "Certificado de migración (global y específica)",  nivel: "obligatorio" },
    { nombre: "Declaración de ausencia de alérgenos en fabricación", nivel: "obligatorio" },
    { nombre: "Ficha técnica (composición, gramaje, resina)",    nivel: "obligatorio" },
    { nombre: "BRCGS Packaging Materials o equivalente GFSI",   nivel: "recomendado" },
    { nombre: "Declaración de sustancias restringidas (REACH)",  nivel: "recomendado" },
  ],
  auxiliar_sin_contacto: [
    { nombre: "Ficha técnica",   nivel: "obligatorio" },
    { nombre: "ISO 9001",        nivel: "recomendado" },
    { nombre: "BRCGS Packaging Materials", nivel: "complementario" },
  ],
  servicio: [
    { nombre: "Habilitación o matrícula profesional vigente",    nivel: "obligatorio" },
    { nombre: "Seguro de responsabilidad civil vigente",         nivel: "obligatorio" },
    { nombre: "ISO/IEC 17025 (laboratorios de análisis)",        nivel: "recomendado" },
    { nombre: "Certificación BRCGS o GFSI reconocida",           nivel: "recomendado" },
    { nombre: "Procedimiento de trabajo / SOP del servicio",     nivel: "complementario" },
  ],
  materia_prima: [
    { nombre: "Certificado de análisis (CoA) por lote",          nivel: "obligatorio" },
    { nombre: "Declaración de alérgenos",                        nivel: "obligatorio" },
    { nombre: "Certificado BRCGS / IFS / SQF o equivalente GFSI", nivel: "recomendado" },
    { nombre: "Plan HACCP del proveedor",                        nivel: "recomendado" },
    { nombre: "Certificado de origen",                           nivel: "complementario" },
  ],
  otro: [],
};

export function checklistBRCGS(tipo: TipoInsumo): Omit<DocumentoProveedor, "id">[] {
  return [...BASE, ...(DOCS_POR_TIPO[tipo] ?? [])];
}

export function estadoHomologacion(prov: Proveedor): "aprobado" | "condicional" | "no_aprobado" | "en_proceso" {
  const docs = prov.documentos ?? [];
  if (docs.length === 0) return "en_proceso";
  const obligatorios = docs.filter(d => d.nivel === "obligatorio");
  const recomendados = docs.filter(d => d.nivel === "recomendado");
  if (obligatorios.some(d => estadoDocumento(d) === "vencido" || estadoDocumento(d) === "pendiente")) return "no_aprobado";
  if (recomendados.some(d => estadoDocumento(d) === "vencido" || estadoDocumento(d) === "pendiente")) return "condicional";
  if (obligatorios.some(d => estadoDocumento(d) === "por_vencer")) return "condicional";
  return "aprobado";
}
