import ExcelJS from "exceljs";
import { loadData, vencimientoEfectivo, getPolizaDeDestinacion } from "@/lib/abastecimiento-store";
import type { ExportOpts } from "@/components/abastecimiento/ExportModal";

// ── colores ───────────────────────────────────────────────────────
const INDIGO  = "FF4F46E5";
const WHITE   = "FFFFFFFF";
const LIGHT   = "FFF5F3FF";
const GRAY    = "FF6B7280";
const RED     = "FFEF4444";
const ORANGE  = "FFF97316";
const YELLOW  = "FFF59E0B";
const GREEN   = "FF22C55E";
const STRIPE  = "FFF9F9FF";

// ── helpers ───────────────────────────────────────────────────────
function fmt(f: string) {
  if (!f) return "—";
  const [y,m,d] = f.split("-");
  return !y||!m||!d ? f : `${d}/${m}/${y}`;
}
function diasRest(fecha: string): number | null {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const d = new Date(fecha); d.setHours(0,0,0,0);
  return Math.round((d.getTime()-hoy.getTime())/86400000);
}
function enRango(fecha: string, desde: string, hasta: string): boolean {
  if (!fecha) return false;
  return fecha >= desde && fecha <= hasta;
}
function colorDias(d: number|null): string {
  if (d===null) return GRAY;
  if (d<0) return RED;
  if (d<=15) return RED;
  if (d<=45) return ORANGE;
  if (d<=90) return YELLOW;
  return GREEN;
}

// ── diseño de hoja ────────────────────────────────────────────────
function sheetHeader(
  ws: ExcelJS.Worksheet,
  cols: string[],
  title: string,
  empresa: string,
  desde: string,
  hasta: string,
) {
  const last = String.fromCharCode(64 + cols.length);
  ws.mergeCells(`A1:${last}1`);
  const t = ws.getCell("A1");
  t.value = title;
  t.font = { bold:true, size:13, color:{argb:WHITE} };
  t.fill = { type:"pattern", pattern:"solid", fgColor:{argb:INDIGO} };
  t.alignment = { horizontal:"center", vertical:"middle" };
  ws.getRow(1).height = 30;

  ws.mergeCells(`A2:${last}2`);
  const sub = ws.getCell("A2");
  sub.value = `${empresa}  ·  Período: ${fmt(desde)} al ${fmt(hasta)}`;
  sub.font = { size:10, italic:true, color:{argb:GRAY} };
  sub.alignment = { horizontal:"center" };
  ws.getRow(2).height = 16;

  const hRow = ws.getRow(3);
  cols.forEach((c,i) => {
    const cell = hRow.getCell(i+1);
    cell.value = c;
    cell.font = { bold:true, size:10, color:{argb:WHITE} };
    cell.fill = { type:"pattern", pattern:"solid", fgColor:{argb:INDIGO} };
    cell.alignment = { horizontal:"center", vertical:"middle", wrapText:true };
  });
  hRow.height = 22;
}

function stripe(ws: ExcelJS.Worksheet, row: ExcelJS.Row, idx: number) {
  row.eachCell({includeEmpty:false}, cell => {
    cell.fill = { type:"pattern", pattern:"solid", fgColor:{argb: idx%2===0 ? WHITE : STRIPE} };
    cell.alignment = { vertical:"middle" };
  });
  row.height = 18;
}

function autoWidth(ws: ExcelJS.Worksheet) {
  ws.columns.forEach(col => {
    let max = 10;
    col.eachCell?.({includeEmpty:false}, cell => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max+3, 42);
  });
}

// ── export principal ──────────────────────────────────────────────
export async function exportToExcel(opts?: ExportOpts) {
  const data = loadData();
  const desde = opts?.desde ?? data.periodo + "-01";
  const hasta  = opts?.hasta  ?? new Date().toISOString().slice(0,10);
  const sec    = opts?.secciones ?? new Set(["dashboard","destinaciones","polizas","insumos","compras","importaciones","proveedores","kpis","plan"]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistema Informe Abastecimiento";
  wb.created = new Date();

  const periodoLabel = `${fmt(desde)} al ${fmt(hasta)}`;

  // ── DASHBOARD ─────────────────────────────────────────────────
  if (sec.has("dashboard")) {
    const ws = wb.addWorksheet("DASHBOARD");
    ws.mergeCells("A1:D1");
    const t = ws.getCell("A1");
    t.value = "RESUMEN EJECUTIVO";
    t.font = { bold:true, size:14, color:{argb:WHITE} };
    t.fill = { type:"pattern", pattern:"solid", fgColor:{argb:INDIGO} };
    t.alignment = { horizontal:"center", vertical:"middle" };
    ws.getRow(1).height = 36;

    ws.mergeCells("A2:D2");
    const sub = ws.getCell("A2");
    sub.value = `${data.empresa}  ·  Período: ${periodoLabel}`;
    sub.font = { size:10, italic:true, color:{argb:GRAY} };
    sub.alignment = { horizontal:"center" };
    ws.getRow(2).height = 16;

    const destCrit = data.destinaciones.filter(d => { const x=diasRest(vencimientoEfectivo(d)); return x!==null&&x>=0&&x<=15; });
    const destProx = data.destinaciones.filter(d => { const x=diasRest(vencimientoEfectivo(d)); return x!==null&&x>15&&x<=90; });
    const polActivas = data.polizas.filter(p => p.estado==="Activa");
    const prima = polActivas.reduce((s,p)=>s+(p.primaARS??0),0);

    const kpis: [string,string|number,string][] = [
      ["IMPORTACIONES TEMPORALES","",""],
      ["Total destinaciones IT", data.destinaciones.length, ""],
      ["  Críticas (≤15 días)", destCrit.length, destCrit.length>0?"⚠️ ATENCIÓN":""],
      ["  Próximas (≤90 días)", destProx.length, ""],
      ["  Con saldo MOA > 0", data.destinaciones.filter(d=>d.stockDocumental>0).length, ""],
      ["","",""],
      ["PÓLIZAS DE CAUCIÓN","",""],
      ["  Pólizas activas", polActivas.length, ""],
      ["  Prima mensual total", prima>0?`$${prima.toLocaleString("es-AR")}`:"—", ""],
      ["  Bajas solicitadas", data.polizas.filter(p=>p.estado==="Baja solicitada").length, ""],
      ["","",""],
      ["INSUMOS","",""],
      ["  Total insumos", data.insumosStock.length, ""],
      ["  Insumos IT", data.insumosStock.filter(i=>i.tipo==="IT").length, ""],
      ["  Con diferencia vs MOA", data.insumosStock.filter(i=>{
        if(i.saldoMOA<=0||i.tipo!=="IT") return false;
        const f=(i as any).factorConvMOA??1;
        return Math.round(i.saldoMOA*f*100)/100 !== i.stockFisico;
      }).length, ""],
      ["","",""],
      ["COMPRAS / PLAN","",""],
      ["  Órdenes de compra", data.ordenesCompra.length, ""],
      ["  OC pendientes", data.ordenesCompra.filter(o=>o.estado==="Pendiente"||o.estado==="Parcial").length, ""],
      ["  Acciones pendientes", data.acciones.filter(a=>a.estado!=="Completada").length, ""],
    ];

    kpis.forEach(([label,val,nota],i) => {
      const row = ws.getRow(4+i);
      if (val==="") {
        row.getCell(2).value = label;
        row.getCell(2).font = { bold:true, size:11, color:{argb:INDIGO} };
        row.getCell(2).fill = { type:"pattern", pattern:"solid", fgColor:{argb:LIGHT} };
        ws.mergeCells(`B${4+i}:D${4+i}`);
        row.height = 20;
      } else {
        row.getCell(2).value = label;
        row.getCell(2).font = { size:10 };
        row.getCell(3).value = val;
        row.getCell(3).font = { bold:true, size:12, color:{argb:INDIGO} };
        row.getCell(3).alignment = { horizontal:"center" };
        if (nota) { row.getCell(4).value = nota; row.getCell(4).font = { color:{argb:RED}, size:10 }; }
        row.height = 18;
      }
    });
    ws.columns = [{width:3},{width:34},{width:14},{width:18}];
  }

  // ── DESTINACIONES ─────────────────────────────────────────────
  if (sec.has("destinaciones")) {
    const ws = wb.addWorksheet("DESTINACIONES x VENCER");
    const cols = ["N° Destinación","Descripción","Alta ARCA","Vto. Original","Vto. Prórroga","Vto. Actual","Días Rest.","Estado","Saldo MOA","Unidad","Póliza","Observaciones"];
    sheetHeader(ws, cols, "DESTINACIONES x VENCER — IT", data.empresa, desde, hasta);

    const sorted = [...data.destinaciones].sort((a,b)=>{
      const da=diasRest(vencimientoEfectivo(a))??9999;
      const db=diasRest(vencimientoEfectivo(b))??9999;
      return da-db;
    });

    sorted.forEach((d,i) => {
      const venc = vencimientoEfectivo(d);
      const dr = diasRest(venc);
      const estado = dr===null?"Sin fecha":dr<0?"VENCIDA":dr<=15?"CRÍTICA":dr<=90?"PRÓXIMA":"Vigente";
      const poliza = getPolizaDeDestinacion(d.numero, data.polizas);
      const row = ws.getRow(4+i);
      row.values = [d.numero, d.descripcion, fmt(d.fechaAltaARCA), fmt(d.fechaVtoOriginal),
        d.fechaVtoProrroga&&d.fechaVtoProrroga!==d.fechaVtoOriginal?fmt(d.fechaVtoProrroga):"—",
        fmt(venc), dr??"-", estado, d.stockDocumental>0?d.stockDocumental:"—", d.unidad, poliza?.numero||"—", d.observaciones||""];
      stripe(ws, row, i);
      if (dr!==null) row.getCell(7).font = { bold:true, color:{argb:colorDias(dr)} };
      row.getCell(8).font = { bold:true, color:{argb:colorDias(dr)} };
      if (d.stockDocumental>0) row.getCell(9).font = { bold:true, color:{argb:YELLOW.replace("FF","FF")} };
    });
    autoWidth(ws);
  }

  // ── PÓLIZAS ───────────────────────────────────────────────────
  if (sec.has("polizas")) {
    const ws = wb.addWorksheet("PÓLIZAS DE CAUCIÓN");
    const cols = ["N° Póliza","Aseguradora","Estado","Garantía USD","Prima ARS/mes","F. Emisión","Vto. Póliza","Destinaciones vinculadas","Motivo baja","Gestión","Observaciones"];
    sheetHeader(ws, cols, "PÓLIZAS DE CAUCIÓN", data.empresa, desde, hasta);

    data.polizas.forEach((p,i) => {
      const row = ws.getRow(4+i);
      row.values = [p.numero||"—", p.aseguradora||"—", p.estado,
        p.montoGarantiaUSD>0?p.montoGarantiaUSD:"—",
        p.primaARS>0?p.primaARS:"—",
        fmt(p.fechaEmision), fmt(p.fechaVencimiento),
        p.destinacionesVinculadas.join(", ")||"—",
        p.motivoBaja||"—", fmt(p.fechaGestion), p.observaciones||""];
      stripe(ws, row, i);
      const colores: Record<string,string> = { Activa:GREEN, "Baja solicitada":ORANGE, "Dada de baja":GRAY, "Prórroga solicitada":YELLOW };
      row.getCell(3).font = { bold:true, color:{argb:colores[p.estado]||GRAY} };
    });
    autoWidth(ws);
  }

  // ── INSUMOS QUÍMICOS ──────────────────────────────────────────
  if (sec.has("insumos")) {
    const GRUPOS_QUI = new Set(["Ácidos","Gomas / Espesantes","Álcalis","Sales","Sulfatos / Minerales","Aditivos / Conservantes"]);

    // Hoja 1: Químicos
    const wsQ = wb.addWorksheet("INSUMOS QUÍMICOS");
    const colsQ = ["Código","Descripción","Grupo","Tipo","Unidad","Depósito","En Producción","Prod. Term.","TOTAL","Saldo MOA","Ud. MOA","Conv. MOA","Diferencia","Fecha Conteo"];
    sheetHeader(wsQ, colsQ, "INSUMOS QUÍMICOS — CONTROL DE STOCK", data.empresa, desde, hasta);

    const quimicos = data.insumosStock.filter(i=>GRUPOS_QUI.has(i.grupo));
    quimicos.forEach((item,i) => {
      const factor = (item as any).factorConvMOA??1;
      const moaConv = item.saldoMOA>0 ? Math.round(item.saldoMOA*factor*100)/100 : 0;
      const diff = item.saldoMOA>0 ? Math.round((item.stockFisico-moaConv)*100)/100 : null;
      const row = wsQ.getRow(4+i);
      row.values = [item.codigo, item.descripcion, item.grupo, item.tipo, item.unidad,
        item.deposito, item.enProduccion, item.productoTerminado, item.stockFisico,
        item.saldoMOA>0?item.saldoMOA:"—", (item as any).unidadMOA||item.unidad, moaConv>0?moaConv:"—",
        diff!==null?(diff>0?`+${diff}`:diff):"—", fmt(item.fechaConteo)];
      stripe(wsQ, row, i);
      row.getCell(4).font = { bold:true, color:{argb:item.tipo==="IT"?INDIGO:GRAY} };
      if (diff!==null&&diff!==0) row.getCell(13).font = { bold:true, color:{argb:diff>0?GREEN:RED} };
    });
    autoWidth(wsQ);

    // Hoja 2: Material Auxiliar
    const wsA = wb.addWorksheet("MATERIAL AUXILIAR");
    const colsA = ["Código","Descripción","Grupo","Tipo","Unidad","Stock Físico","Fecha Conteo"];
    sheetHeader(wsA, colsA, "MATERIAL AUXILIAR — CONTROL DE STOCK", data.empresa, desde, hasta);

    const auxiliar = data.insumosStock.filter(i=>!GRUPOS_QUI.has(i.grupo));
    let row = 4;
    let grpActual = "";
    auxiliar.forEach(item => {
      if (item.grupo !== grpActual) {
        grpActual = item.grupo;
        const gRow = wsA.getRow(row++);
        gRow.getCell(1).value = item.grupo.toUpperCase();
        wsA.mergeCells(`A${row-1}:G${row-1}`);
        gRow.getCell(1).font = { bold:true, size:10, color:{argb:INDIGO} };
        gRow.getCell(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:LIGHT} };
        gRow.height = 18;
      }
      const r = wsA.getRow(row);
      r.values = [item.codigo, item.descripcion, item.grupo, item.tipo, item.unidad, item.stockFisico, fmt(item.fechaConteo)];
      stripe(wsA, r, row);
      r.getCell(4).font = { bold:true, color:{argb:item.tipo==="IT"?INDIGO:GRAY} };
      row++;
    });
    autoWidth(wsA);
  }

  // ── COMPRAS ───────────────────────────────────────────────────
  if (sec.has("compras")) {
    const ws = wb.addWorksheet("COMPRAS NACIONALES");
    const cols = ["N° OC","Proveedor","Insumo","Cantidad","Unidad","P. Unitario","Moneda","F. Emisión","F. Entrega","Estado","Justificación"];
    sheetHeader(ws, cols, "COMPRAS NACIONALES", data.empresa, desde, hasta);

    const ocs = data.ordenesCompra.filter(o => !desde || enRango(o.fechaEmision, desde, hasta) || !o.fechaEmision);
    ocs.forEach((oc,i) => {
      const row = ws.getRow(4+i);
      row.values = [oc.numero, oc.proveedor, oc.insumo, oc.cantidad, oc.unidad,
        oc.precioUnitario, oc.moneda, fmt(oc.fechaEmision), fmt(oc.fechaEntrega), oc.estado, oc.justificacion];
      stripe(ws, row, i);
      const colores: Record<string,string> = { Recibida:GREEN, Pendiente:YELLOW, Parcial:ORANGE, Cancelada:RED };
      row.getCell(10).font = { bold:true, color:{argb:colores[oc.estado]||GRAY} };
    });
    autoWidth(ws);
    if (ocs.length === 0) { ws.getRow(4).getCell(1).value = "Sin registros en el período seleccionado"; }
  }

  // ── IMPORTACIONES COMUNES ─────────────────────────────────────
  if (sec.has("importaciones")) {
    const ws = wb.addWorksheet("IMPORTACIONES");
    const cols = ["N° Despacho","Proveedor","País Origen","Descripción","Valor USD","Cantidad","Unidad","F. Embarque","F. Arribo","F. Nac.","Estado","Observaciones"];
    sheetHeader(ws, cols, "IMPORTACIONES COMUNES", data.empresa, desde, hasta);

    const imps = data.importacionesComunes.filter(i => !desde || enRango(i.fechaArribo||i.fechaEmbarque, desde, hasta) || (!i.fechaArribo&&!i.fechaEmbarque));
    imps.forEach((imp,i) => {
      const row = ws.getRow(4+i);
      row.values = [imp.numero, imp.proveedor, imp.paisOrigen, imp.descripcion, imp.valorUSD,
        imp.cantidad, imp.unidad, fmt(imp.fechaEmbarque), fmt(imp.fechaArribo), fmt(imp.fechaNacionalizacion), imp.estado, imp.observaciones];
      stripe(ws, row, i);
      const colores: Record<string,string> = { Nacionalizada:GREEN, "En tránsito":YELLOW, "En aduana":ORANGE, Cancelada:RED };
      row.getCell(11).font = { bold:true, color:{argb:colores[imp.estado]||GRAY} };
    });
    autoWidth(ws);
    if (imps.length === 0) { ws.getRow(4).getCell(1).value = "Sin registros en el período seleccionado"; }
  }

  // ── PROVEEDORES ───────────────────────────────────────────────
  if (sec.has("proveedores")) {
    const ws = wb.addWorksheet("PROVEEDORES");
    const cols = ["Código","Razón Social","Tipo","Categorías","País","Contacto","Email","CUIT","Cond. Pago","Calificación","Homologado","F. Homolog.","Vto. Homolog.","Activo"];
    sheetHeader(ws, cols, "PROVEEDORES", data.empresa, desde, hasta);

    data.proveedores.forEach((p,i) => {
      const row = ws.getRow(4+i);
      row.values = [p.codigo, p.razonSocial, p.tipo, p.categorias.join(", "), p.pais,
        p.contacto, p.email, p.cuit, p.condicionPago, `${p.calificacion}★`,
        p.homologado?"✓ Sí":"✗ No", fmt(p.fechaHomologacion), fmt(p.vencimientoHomologacion), p.activo?"Activo":"Inactivo"];
      stripe(ws, row, i);
      row.getCell(11).font = { bold:true, color:{argb:p.homologado?GREEN:RED} };
      row.getCell(14).font = { bold:true, color:{argb:p.activo?GREEN:GRAY} };
    });
    autoWidth(ws);
  }

  // ── KPIs ──────────────────────────────────────────────────────
  if (sec.has("kpis")) {
    const ws = wb.addWorksheet("KPIs");
    ws.mergeCells("A1:D1");
    const t = ws.getCell("A1");
    t.value = `KPIs DE GESTIÓN — ${data.empresa} — ${periodoLabel}`;
    t.font = { bold:true, size:13, color:{argb:WHITE} };
    t.fill = { type:"pattern", pattern:"solid", fgColor:{argb:INDIGO} };
    t.alignment = { horizontal:"center", vertical:"middle" };
    ws.getRow(1).height = 30;

    const ocs = data.ordenesCompra;
    const dests = data.destinaciones;
    const kpiRows: [string,string|number,string][] = [
      ["COMPRAS NACIONALES","",""],
      ["Total OC emitidas", ocs.length, ""],
      ["OC recibidas", ocs.filter(o=>o.estado==="Recibida").length, ""],
      ["% cumplimiento", ocs.length>0?`${Math.round(ocs.filter(o=>o.estado==="Recibida").length/ocs.length*100)}%`:"—", ""],
      ["OC pendientes", ocs.filter(o=>o.estado==="Pendiente"||o.estado==="Parcial").length, ""],
      ["","",""],
      ["IMPORTACIONES TEMPORALES (IT)","",""],
      ["Total destinaciones", dests.length, ""],
      ["Con saldo MOA activo", dests.filter(d=>d.stockDocumental>0).length, ""],
      ["Críticas (vto ≤15d)", dests.filter(d=>{const x=diasRest(vencimientoEfectivo(d));return x!==null&&x>=0&&x<=15;}).length, ""],
      ["Próximas (vto ≤90d)", dests.filter(d=>{const x=diasRest(vencimientoEfectivo(d));return x!==null&&x>15&&x<=90;}).length, ""],
      ["","",""],
      ["PÓLIZAS DE CAUCIÓN","",""],
      ["Pólizas activas", data.polizas.filter(p=>p.estado==="Activa").length, ""],
      ["Prima mensual total", data.polizas.filter(p=>p.estado==="Activa").reduce((s,p)=>s+(p.primaARS??0),0)>0
        ?`$${data.polizas.filter(p=>p.estado==="Activa").reduce((s,p)=>s+(p.primaARS??0),0).toLocaleString("es-AR")}`:"—", ""],
      ["Bajas solicitadas", data.polizas.filter(p=>p.estado==="Baja solicitada").length, ""],
      ["","",""],
      ["INSUMOS","",""],
      ["Total insumos", data.insumosStock.length, ""],
      ["Insumos IT", data.insumosStock.filter(i=>i.tipo==="IT").length, ""],
      ["Con diferencia física vs MOA", data.insumosStock.filter(i=>{
        if(i.saldoMOA<=0||i.tipo!=="IT") return false;
        const f=(i as any).factorConvMOA??1;
        return Math.round(i.saldoMOA*f*100)/100!==i.stockFisico;
      }).length, ""],
      ["","",""],
      ["PLAN DE ACCIÓN","",""],
      ["Total acciones", data.acciones.length, ""],
      ["Completadas", data.acciones.filter(a=>a.estado==="Completada").length, ""],
      ["Pendientes / En curso", data.acciones.filter(a=>a.estado!=="Completada").length, ""],
      ["Prioridad Alta pendientes", data.acciones.filter(a=>a.prioridad==="Alta"&&a.estado!=="Completada").length, ""],
    ];

    kpiRows.forEach(([label,val,nota],i) => {
      const row = ws.getRow(3+i);
      if (val==="") {
        ws.mergeCells(`B${3+i}:D${3+i}`);
        row.getCell(2).value = label;
        row.getCell(2).font = { bold:true, size:11, color:{argb:INDIGO} };
        row.getCell(2).fill = { type:"pattern", pattern:"solid", fgColor:{argb:LIGHT} };
        row.height = 20;
      } else {
        row.getCell(2).value = label; row.getCell(2).font = { size:10 };
        row.getCell(3).value = val; row.getCell(3).font = { bold:true, size:12, color:{argb:INDIGO} };
        row.getCell(3).alignment = { horizontal:"center" };
        if (nota) { row.getCell(4).value = nota; row.getCell(4).font = { color:{argb:RED},size:10 }; }
        row.height = 18;
      }
    });
    ws.columns = [{width:3},{width:36},{width:14},{width:20}];
  }

  // ── PLAN DE ACCIÓN ────────────────────────────────────────────
  if (sec.has("plan")) {
    const ws = wb.addWorksheet("PLAN DE ACCIÓN");
    const cols = ["Descripción","Prioridad","Responsable","F. Compromiso","Estado","Avance %"];
    sheetHeader(ws, cols, "PLAN DE ACCIÓN", data.empresa, desde, hasta);

    data.acciones.forEach((a,i) => {
      const row = ws.getRow(4+i);
      row.values = [a.descripcion, a.prioridad, a.responsable, fmt(a.fechaCompromiso), a.estado, `${a.avance}%`];
      stripe(ws, row, i);
      const p: Record<string,string> = { Alta:RED, Media:YELLOW, Baja:GREEN };
      row.getCell(2).font = { bold:true, color:{argb:p[a.prioridad]||GRAY} };
      const e: Record<string,string> = { Completada:GREEN, "En curso":YELLOW, Pendiente:ORANGE, Vencida:RED };
      row.getCell(5).font = { bold:true, color:{argb:e[a.estado]||GRAY} };
    });
    autoWidth(ws);
  }

  // ── Descargar ─────────────────────────────────────────────────
  const desde2 = desde.replace(/-/g,"");
  const hasta2  = hasta.replace(/-/g,"");
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Informe_Abastecimiento_${desde2}_${hasta2}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
