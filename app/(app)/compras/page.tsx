"use client";
import { useEffect, useState } from "react";
import { loadData, saveData, OrdenCompra, EmpresaOC, nextNumeroOC, uid } from "@/lib/abastecimiento-store";
import FormField, { Input, Select, Textarea } from "@/components/abastecimiento/FormField";
import { Plus, Trash2, Pencil, X, CheckCircle2, ShoppingCart, FileSpreadsheet, Printer, Building2, Paperclip, ExternalLink, FileText } from "lucide-react";
import ExportModal, { type ExportOpts } from "@/components/abastecimiento/ExportModal";

const ESTADOS: OrdenCompra["estado"][] = ["Pendiente", "Parcial", "Recibida", "Cancelada"];
const EMPRESAS: EmpresaOC[] = ["Seville Cazorla", "Tomalar"];

const estadoStyle: Record<string, string> = {
  Recibida:  "bg-green-100 text-green-700 border-green-200",
  Pendiente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Parcial:   "bg-orange-100 text-orange-700 border-orange-200",
  Cancelada: "bg-red-100 text-red-700 border-red-200",
};

const empresaStyle: Record<EmpresaOC, string> = {
  "Seville Cazorla": "bg-olive-100 text-olive-800",
  "Tomalar":         "bg-red-100 text-red-800",
};

function fmtDate(s: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

const emptyOC = (empresa: EmpresaOC, ocs: OrdenCompra[]): OrdenCompra => {
  const { numero, correlativo } = nextNumeroOC(empresa, ocs);
  return {
    id: uid(),
    empresa,
    numero,
    correlativo,
    proveedor: "",
    direccionProveedor: "",
    ciudadPaisProveedor: "",
    insumo: "",
    cantidad: 0,
    unidad: "",
    precioUnitario: 0,
    moneda: "ARS",
    tipoCambio: undefined,
    iva: 21,
    fechaEmision: new Date().toISOString().slice(0, 10),
    fechaEntrega: "",
    numPresupuesto: "",
    fechaPresupuesto: "",
    condicionPago: "",
    lugarEntrega: "",
    presupuestoArchivo: undefined,
    facturaArchivo: undefined,
    comprobantePagoArchivo: undefined,
    remitosArchivos: [],
    estado: "Pendiente",
    justificacion: "",
  };
};

// ── helpers PDF ───────────────────────────────────────────────────────────────
const EMPRESA_INFO: Record<string, { cuit: string; domicilio: string; contacto: string; nombreLegal: string }> = {
  "Seville Cazorla": {
    cuit: "30-71070490-9",
    domicilio: "Ruta Nacional n° 38 km 434,5",
    contacto: "3804-249993",
    nombreLegal: "Seville Cazorla S.A.",
  },
  "Tomalar": {
    cuit: "30-XXXXXXXXX-X",
    domicilio: "La Rioja, Argentina",
    contacto: "",
    nombreLegal: "Tomalar S.A.",
  },
};

// ── PDF modal ─────────────────────────────────────────────────────────────────
function ModalPDF({ oc, onClose }: { oc: OrdenCompra; onClose: () => void }) {
  const neto  = oc.cantidad * oc.precioUnitario;
  const ivaAmt = neto * ((oc.iva ?? 21) / 100);
  const total  = neto + ivaAmt;
  const info   = EMPRESA_INFO[oc.empresa] ?? EMPRESA_INFO["Seville Cazorla"];
  const fmt    = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=860,height=1100");
    if (!win) return;
    const origin = window.location.origin;
    const tcHtml = (oc.moneda !== "ARS" && oc.tipoCambio)
      ? `<div style="text-align:right;font-size:11px;color:#666;margin-bottom:14px">Tipo de cambio utilizado: <strong>1 ${oc.moneda} = ARS ${oc.tipoCambio.toLocaleString("es-AR", {minimumFractionDigits:2})}</strong></div>`
      : "";
    const logoHtml = oc.empresa === "Seville Cazorla"
      ? `<img src="${origin}/logo-seville.jpg" style="height:72px;width:auto;object-fit:contain" alt="Seville Cazorla"/>`
      : `<img src="${origin}/logo-tomalar.jpg" style="height:72px;width:auto;object-fit:contain" alt="Tomalar"/>`;

    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>OC ${oc.numero}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:32px 36px}
.header-wrap{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0}
.header-mid{flex:1;padding:0 20px}
.header-mid p{font-size:11px;line-height:1.7;color:#333}
.header-mid strong{font-weight:700}
.num-box{border:1px solid #ccc;padding:4px 14px;text-align:center;min-width:90px}
.num-box .lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#555}
.num-box .val{font-size:15px;font-weight:700;color:#1a1a1a}
.title{text-align:center;font-size:20px;font-weight:700;letter-spacing:.05em;margin:16px 0 14px;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:8px 0}
.prov-box{border:1px solid #ccc;margin-bottom:14px}
.prov-top{border-bottom:1px solid #ccc;padding:6px 10px}
.prov-bottom{display:flex}
.prov-bottom-left{flex:1;padding:5px 10px;border-right:1px solid #ccc}
.prov-bottom-right{width:180px;padding:5px 10px}
.prov-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#777;margin-bottom:1px}
.prov-val{font-size:12px;color:#1a1a1a}
table{width:100%;border-collapse:collapse;margin-bottom:6px}
th{border:1px solid #aaa;padding:5px 8px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;background:#f0f0f0}
td{border:1px solid #aaa;padding:5px 8px;font-size:12px;vertical-align:top}
td.desc{width:55%}
td.num{text-align:right;white-space:nowrap}
.totales{width:280px;margin-left:auto;border-collapse:collapse}
.totales td{border:1px solid #aaa;padding:4px 8px;font-size:12px}
.totales td:first-child{font-weight:700;text-align:right;background:#f0f0f0}
.totales td:last-child{text-align:right;min-width:110px}
.totales tr.grand td{font-weight:700;background:#eee}
.footer-block{margin-top:14px;font-size:11px;line-height:1.8}
.footer-block .row{display:flex;gap:12px;align-items:baseline}
.footer-block .row .key{font-weight:700;min-width:140px;flex-shrink:0}
.firma-area{margin-top:40px;text-align:right;font-size:11px;font-style:italic;line-height:1.7}
.empresa-nombre{font-size:14px;font-weight:700;color:#1a1a1a}
@media print{
  body{padding:12px 18px}
  table,tr,td,th{page-break-inside:avoid}
  .firma-area{page-break-inside:avoid}
  .footer-block{page-break-inside:avoid}
}
</style></head><body>

<div class="header-wrap">
  <div>${logoHtml}</div>
  <div class="header-mid">
    <p><strong>CUIT:</strong> ${info.cuit}</p>
    <p><strong>DOMICILIO:</strong> ${info.domicilio}</p>
    ${info.contacto ? `<p><strong>CONTACTO:</strong> ${info.contacto}</p>` : ""}
  </div>
  <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
    <div class="num-box"><div class="lbl">N°</div><div class="val">${oc.numero}</div></div>
    <div class="num-box"><div class="lbl">Fecha</div><div class="val">${fmtDate(oc.fechaEmision)}</div></div>
    <div style="margin-top:4px;font-size:13px;font-weight:700;color:#1a1a1a;text-align:right">${info.nombreLegal}</div>
  </div>
</div>

<div class="title">ORDEN DE COMPRA</div>

<div class="prov-box">
  <div class="prov-top">
    <div class="prov-lbl">Proveedor</div>
    <div class="prov-val" style="font-size:13px;font-weight:700">${oc.proveedor || "—"}</div>
  </div>
  <div class="prov-bottom">
    <div class="prov-bottom-left">
      <div class="prov-lbl">Dirección</div>
      <div class="prov-val">${oc.direccionProveedor || "—"}</div>
    </div>
    <div class="prov-bottom-right">
      <div class="prov-lbl">País / Ciudad</div>
      <div class="prov-val">${oc.ciudadPaisProveedor || "—"}</div>
    </div>
  </div>
</div>

<table>
  <thead><tr><th>Cantidad</th><th class="desc">Descripción</th><th>P. Unitario</th><th>Total</th></tr></thead>
  <tbody>
    <tr>
      <td class="num">${oc.cantidad.toLocaleString("es-AR")}&nbsp;${oc.unidad}</td>
      <td class="desc">${oc.insumo}</td>
      <td class="num">${oc.moneda}&nbsp;${fmt(oc.precioUnitario)}</td>
      <td class="num">${oc.moneda}&nbsp;${fmt(neto)}</td>
    </tr>
  </tbody>
</table>

${tcHtml}<div style="display:flex;justify-content:flex-end;margin-bottom:14px">
  <table class="totales">
    <tr><td>Neto</td><td>${oc.moneda}&nbsp;${fmt(neto)}</td></tr>
    ${oc.iva > 0 ? `<tr><td>IVA ${oc.iva}%</td><td>${oc.moneda}&nbsp;${fmt(ivaAmt)}</td></tr>` : ""}
    <tr class="grand"><td>Total</td><td>${oc.moneda}&nbsp;${fmt(total)}</td></tr>
  </table>
</div>

<div class="footer-block">
  ${oc.numPresupuesto ? `<div class="row"><span class="key">Según presupuesto:</span><span>${oc.numPresupuesto}</span></div>` : ""}
  ${oc.fechaPresupuesto ? `<div class="row"><span class="key">Fecha:</span><span>${fmtDate(oc.fechaPresupuesto)}</span></div>` : ""}
  ${oc.condicionPago ? `<div class="row"><span class="key">Condición de pago:</span><span style="max-width:420px">${oc.condicionPago}</span></div>` : ""}
  ${oc.fechaEntrega ? `<div class="row"><span class="key">Fecha de entrega:</span><span>${fmtDate(oc.fechaEntrega)}</span></div>` : ""}
  ${oc.lugarEntrega ? `<div class="row"><span class="key">Lugar de entrega:</span><span style="max-width:420px">${oc.lugarEntrega}</span></div>` : ""}
  ${oc.justificacion ? `<div class="row"><span class="key">Observaciones:</span><span style="max-width:420px">${oc.justificacion}</span></div>` : ""}
</div>

<div class="firma-area">
  <p><strong>Ignacio Sant Siles</strong></p>
  <p><em>Responsable de Compras y Comercio Exterior</em></p>
  <p><strong>${info.nombreLegal}</strong></p>
</div>

</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-auto">
        {/* toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <span className="font-bold text-gray-800">Vista previa — {oc.numero}</span>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-olive-600 hover:bg-olive-700 text-white text-sm font-semibold rounded-lg transition-colors">
              <Printer size={15} /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
          </div>
        </div>

        {/* vista previa en pantalla — fiel al formato papel */}
        <div className="p-8 text-sm overflow-y-auto max-h-[80vh]">

          {/* Cabecera */}
          <div className="flex justify-between items-start pb-3 border-b border-gray-200 mb-4">
            <div className="flex-shrink-0">
              {oc.empresa === "Seville Cazorla" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/logo-seville.jpg" alt="Seville Cazorla" className="h-14 w-auto object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/logo-tomalar.jpg" alt="Tomalar" className="h-14 w-auto object-contain" />
              )}
            </div>
            <div className="flex-1 px-5 text-xs text-gray-600 leading-relaxed">
              <p><span className="font-bold">CUIT:</span> {info.cuit}</p>
              <p><span className="font-bold">DOMICILIO:</span> {info.domicilio}</p>
              {info.contacto && <p><span className="font-bold">CONTACTO:</span> {info.contacto}</p>}
            </div>
            <div className="flex flex-col gap-1 items-end">
              <div className="border border-gray-300 px-3 py-1 text-center min-w-[90px]">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">N°</p>
                <p className="font-bold text-gray-800 font-mono">{oc.numero}</p>
              </div>
              <div className="border border-gray-300 px-3 py-1 text-center min-w-[90px]">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Fecha</p>
                <p className="font-bold text-gray-800">{fmtDate(oc.fechaEmision)}</p>
              </div>
              <p className="text-sm font-bold text-gray-800 mt-1 text-right">{info.nombreLegal}</p>
            </div>
          </div>

          {/* Título */}
          <h3 className="text-center text-lg font-bold uppercase tracking-widest border-y border-gray-300 py-2 mb-4">
            Orden de Compra
          </h3>

          {/* Proveedor */}
          <div className="mb-4 border border-gray-300 rounded">
            <div className="border-b border-gray-300 px-3 py-2">
              <p className="text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-0.5">Proveedor</p>
              <p className="text-sm font-semibold text-gray-900">{oc.proveedor || "—"}</p>
            </div>
            <div className="flex divide-x divide-gray-300">
              <div className="flex-1 px-3 py-2">
                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-0.5">Dirección</p>
                <p className="text-xs text-gray-800">{oc.direccionProveedor || "—"}</p>
              </div>
              <div className="w-44 px-3 py-2">
                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-0.5">País / Ciudad</p>
                <p className="text-xs text-gray-800">{oc.ciudadPaisProveedor || "—"}</p>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <table className="w-full text-xs border-collapse mb-1">
            <thead>
              <tr className="bg-gray-100">
                {["Cantidad", "Descripción", "P. Unitario", "Total"].map(h => (
                  <th key={h} className="border border-gray-400 px-2 py-1.5 text-center font-bold uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 px-2 py-2 text-right whitespace-nowrap">{oc.cantidad.toLocaleString("es-AR")} {oc.unidad}</td>
                <td className="border border-gray-400 px-2 py-2">{oc.insumo}</td>
                <td className="border border-gray-400 px-2 py-2 text-right whitespace-nowrap">{oc.moneda} {fmt(oc.precioUnitario)}</td>
                <td className="border border-gray-400 px-2 py-2 text-right whitespace-nowrap">{oc.moneda} {fmt(neto)}</td>
              </tr>
            </tbody>
          </table>

          {/* Tipo de cambio */}
          {oc.moneda !== "ARS" && oc.tipoCambio && (
            <div className="flex justify-end text-xs text-gray-500 mb-1">
              Tipo de cambio utilizado: <span className="font-semibold ml-1">1 {oc.moneda} = ARS {oc.tipoCambio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          {/* Totales */}
          <div className="flex justify-end mb-4">
            <table className="text-xs border-collapse w-56">
              <tbody>
                <tr><td className="border border-gray-400 px-3 py-1 font-bold bg-gray-50 text-right">Neto</td><td className="border border-gray-400 px-3 py-1 text-right">{oc.moneda} {fmt(neto)}</td></tr>
                {(oc.iva ?? 21) > 0 && <tr><td className="border border-gray-400 px-3 py-1 font-bold bg-gray-50 text-right">IVA {oc.iva ?? 21}%</td><td className="border border-gray-400 px-3 py-1 text-right">{oc.moneda} {fmt(ivaAmt)}</td></tr>}
                <tr className="font-bold"><td className="border border-gray-400 px-3 py-1 bg-gray-100 text-right">Total</td><td className="border border-gray-400 px-3 py-1 text-right">{oc.moneda} {fmt(total)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Pie comercial */}
          <div className="text-xs leading-relaxed space-y-1 text-gray-700">
            {oc.numPresupuesto && <p><span className="font-bold">Según presupuesto:</span> {oc.numPresupuesto}</p>}
            {oc.fechaPresupuesto && <p><span className="font-bold">Fecha:</span> {fmtDate(oc.fechaPresupuesto)}</p>}
            {oc.condicionPago && <p><span className="font-bold">Condición de pago:</span> {oc.condicionPago}</p>}
            {oc.fechaEntrega && <p><span className="font-bold">Fecha de entrega:</span> {fmtDate(oc.fechaEntrega)}</p>}
            {oc.lugarEntrega && <p><span className="font-bold">Lugar de entrega:</span> {oc.lugarEntrega}</p>}
            {oc.justificacion && <p><span className="font-bold">Observaciones:</span> {oc.justificacion}</p>}
          </div>

          {/* Documentos adjuntos — solo pantalla, no se imprimen */}
          {(oc.presupuestoArchivo || oc.facturaArchivo || oc.comprobantePagoArchivo || (oc.remitosArchivos ?? []).length > 0) && (() => {
            type Archivo = { url: string; nombre: string; tipo: string };
            const DocLink = ({ label, archivo }: { label: string; archivo: Archivo }) => (
              <div className="flex items-center gap-3 px-3 py-2 bg-white border border-blue-100 rounded-lg">
                <FileText size={14} className="text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">{label}</p>
                  <p className="text-xs text-blue-800 truncate">{archivo.nombre}</p>
                </div>
                <a href={archivo.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold rounded transition-colors">
                  <ExternalLink size={11} /> Abrir
                </a>
              </div>
            );
            return (
              <div className="mt-4 border border-blue-200 rounded-xl p-3 bg-blue-50 space-y-2">
                <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Documentos adjuntos</p>
                {oc.presupuestoArchivo && <DocLink label="Presupuesto" archivo={oc.presupuestoArchivo} />}
                {oc.facturaArchivo && <DocLink label="Factura" archivo={oc.facturaArchivo} />}
                {oc.comprobantePagoArchivo && <DocLink label="Comprobante de pago" archivo={oc.comprobantePagoArchivo} />}
                {(oc.remitosArchivos ?? []).map((r, i) => (
                  <DocLink key={i} label={`Remito${(oc.remitosArchivos ?? []).length > 1 ? ` ${i + 1}` : ""}`} archivo={r} />
                ))}
              </div>
            );
          })()}

          {/* Firma */}
          <div className="mt-10 text-right text-xs text-gray-600 italic leading-relaxed">
            <p className="font-bold not-italic text-gray-800">Ignacio Sant Siles</p>
            <p>Responsable de Compras y Comercio Exterior</p>
            <p className="font-bold not-italic text-gray-800">{info.nombreLegal}</p>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function ComprasPage() {
  const [items, setItems]       = useState<OrdenCompra[]>([]);
  const [form, setForm]         = useState<OrdenCompra | null>(null);
  const [editing, setEditing]   = useState<string | null>(null);
  const [pdfOC, setPdfOC]       = useState<OrdenCompra | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [empresaFiltro, setEmpresaFiltro] = useState<EmpresaOC | "Todas">("Todas");

  useEffect(() => { setItems(loadData().ordenesCompra ?? []); }, []);

  const persist = (next: OrdenCompra[]) => {
    const d = loadData(); d.ordenesCompra = next; saveData(d); setItems(next);
  };

  const openNew = (empresa: EmpresaOC = "Seville Cazorla") => {
    setForm(emptyOC(empresa, items));
    setEditing(null);
  };

  const openEdit = (item: OrdenCompra) => { setForm({ ...item }); setEditing(item.id); };
  const closeModal = () => { setForm(null); setEditing(null); };

  const handleEmpresaChange = (e: EmpresaOC) => {
    if (!form || editing) return;
    const { numero, correlativo } = nextNumeroOC(e, items);
    setForm({ ...form, empresa: e, numero, correlativo });
  };

  const handleSave = () => {
    if (!form || !form.proveedor.trim() || !form.insumo.trim()) return;
    persist(editing ? items.map(i => i.id === editing ? form : i) : [...items, form]);
    setSaved(true);
    setTimeout(() => { setSaved(false); closeModal(); }, 700);
  };

  const cycleEstado = (item: OrdenCompra) => {
    const idx = ESTADOS.indexOf(item.estado);
    persist(items.map(i => i.id === item.id ? { ...i, estado: ESTADOS[(idx + 1) % ESTADOS.length] } : i));
  };

  const visible = empresaFiltro === "Todas" ? items : items.filter(i => i.empresa === empresaFiltro);
  const total = visible.reduce((s, o) => s + o.cantidad * o.precioUnitario, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Órdenes de Compra</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {visible.length} {visible.length === 1 ? "orden" : "órdenes"}
            {visible.length > 0 && <span className="ml-2 text-olive-600 font-medium">· Total: {visible[0]?.moneda} {total.toLocaleString("es-AR")}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
            <FileSpreadsheet size={15} /> Exportar
          </button>
          <button onClick={() => openNew("Seville Cazorla")}
            className="flex items-center gap-2 px-3 py-2 bg-olive-600 hover:bg-olive-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus size={16} /> OC Seville
          </button>
          <button onClick={() => openNew("Tomalar")}
            className="flex items-center gap-2 px-3 py-2 bg-red-800 hover:bg-red-900 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus size={16} /> OC Tomalar
          </button>
        </div>
      </div>

      {exportOpen && (
        <ExportModal seccionesPreset={["compras"]} onClose={() => setExportOpen(false)}
          onExport={async (opts: ExportOpts) => { const { exportToExcel } = await import("@/lib/abastecimiento/exportExcel"); await exportToExcel(opts); }} />
      )}

      {/* Filtros por empresa + resumen */}
      <div className="flex items-center gap-3 flex-wrap">
        {(["Todas", ...EMPRESAS] as const).map(e => (
          <button key={e} onClick={() => setEmpresaFiltro(e as typeof empresaFiltro)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
              empresaFiltro === e
                ? e === "Tomalar" ? "bg-red-800 text-white border-red-800" : "bg-olive-600 text-white border-olive-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}>
            {e} {e !== "Todas" && `(${items.filter(i => i.empresa === e).length})`}
          </button>
        ))}
        <div className="ml-auto flex gap-3">
          {EMPRESAS.map(e => {
            const count = items.filter(i => i.empresa === e).length;
            if (!count) return null;
            const last = items.filter(i => i.empresa === e).sort((a,b) => b.correlativo - a.correlativo)[0];
            return (
              <div key={e} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${empresaStyle[e]}`}>
                <Building2 size={11} className="inline mr-1" />
                {e === "Seville Cazorla" ? "SC" : "TOM"} · último: {last?.numero}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen por estado */}
      {visible.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {ESTADOS.map(e => (
            <div key={e} className={`rounded-xl border px-4 py-3 text-center ${estadoStyle[e]}`}>
              <p className="text-xl font-bold">{visible.filter(i => i.estado === e).length}</p>
              <p className="text-xs font-semibold mt-0.5">{e}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {(() => {
        const TF = empresaFiltro === "Tomalar";
        const rowHover  = TF ? "hover:bg-red-50/50"  : "hover:bg-olive-50";
        const iconHover = TF ? "hover:text-red-700 hover:bg-red-50" : "hover:text-olive-600 hover:bg-olive-50";
        const emptyBg   = TF ? "bg-red-50/40 border-red-200"  : "bg-olive-50/40 border-olive-200";
        const emptyIcon = TF ? "text-red-300"                 : "text-olive-400";
        return visible.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["N° OC", "Empresa", "Proveedor", "Insumo", "Cantidad", "Importe", "F. Entrega", "Estado", ""].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map(item => (
                <tr key={item.id}
                  onClick={() => setPdfOC(item)}
                  className={`${rowHover} transition-colors cursor-pointer`}>
                  <td className="px-3 py-3 font-mono text-xs font-bold text-gray-700">{item.numero}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${empresaStyle[item.empresa]}`}>
                      {item.empresa === "Seville Cazorla" ? "SC" : "TOM"}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900 max-w-[150px] truncate">{item.proveedor}</td>
                  <td className="px-3 py-3 text-gray-600 max-w-[150px] truncate">{item.insumo}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="font-medium text-gray-800 text-sm">{item.cantidad.toLocaleString("es-AR")}</span>
                    <span className="text-xs text-gray-400 ml-1">{item.unidad}</span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-right">
                    <p className="font-bold text-gray-900 text-sm tabular-nums">
                      <span className="text-xs font-normal text-gray-400 mr-1">{item.moneda}</span>
                      {(item.cantidad * item.precioUnitario).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-gray-400 tabular-nums">
                      {item.precioUnitario.toLocaleString("es-AR", { minimumFractionDigits: 2 })} × {item.cantidad.toLocaleString("es-AR")}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(item.fechaEntrega)}</td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => cycleEstado(item)} title="Clic para cambiar estado"
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:opacity-80 cursor-pointer ${estadoStyle[item.estado]}`}>
                      {item.estado}
                    </button>
                  </td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 items-center">
                      <button onClick={() => setPdfOC(item)} title="Ver / imprimir PDF"
                        className={`p-1.5 rounded-lg text-gray-400 ${iconHover} transition-colors`}>
                        <Printer size={14} />
                      </button>
                      <button onClick={() => openEdit(item)} title="Editar"
                        className={`p-1.5 rounded-lg text-gray-400 ${iconHover} transition-colors`}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(item.id)} title="Eliminar"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ) : (
        <div className={`${emptyBg} border-2 border-dashed rounded-2xl p-14 text-center`}>
          <ShoppingCart size={28} className={`${emptyIcon} mx-auto mb-3`} />
          <p className="font-semibold text-gray-700">Sin órdenes de compra</p>
          <p className="text-sm text-gray-400 mt-1 mb-6">Usá los botones de arriba para crear la primera OC</p>
        </div>
        );
      })()}

      {/* Modal nueva / editar OC */}
      {form && (() => {
        const T = form.empresa === "Tomalar";
        const th = {
          headerBg:  T ? "bg-red-50 border-red-100"      : "bg-olive-50 border-olive-100",
          label:     T ? "text-red-700"                   : "text-olive-600",
          activeBtn: T ? "bg-red-800 text-white"          : "bg-olive-600 text-white",
          numColor:  T ? "text-red-800"                   : "text-olive-700",
          totalBg:   T ? "bg-red-50 border-red-100"       : "bg-olive-50 border-olive-100",
          totalText: T ? "text-red-600"                   : "text-olive-600",
          totalBold: T ? "text-red-800 border-red-200"    : "text-olive-700 border-olive-200",
          saveBtn:   T ? "bg-red-800 hover:bg-red-900"    : "bg-olive-600 hover:bg-olive-700",
        };
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">{editing ? `Editar OC — ${form.numero}` : "Nueva Orden de Compra"}</h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">

              {/* Empresa + número correlativo */}
              <div className={`${th.headerBg} border rounded-xl px-4 py-3 flex items-center justify-between gap-4`}>
                <div className="space-y-1 flex-1">
                  <p className={`text-xs font-semibold ${th.label} uppercase tracking-wide`}>Empresa emisora</p>
                  <div className="flex gap-2">
                    {EMPRESAS.map(e => (
                      <button key={e} onClick={() => handleEmpresaChange(e)}
                        disabled={!!editing}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                          form.empresa === e
                            ? (e === "Tomalar" ? "bg-red-800 text-white" : "bg-olive-600 text-white")
                            : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">N° OC</p>
                  <p className={`text-2xl font-bold ${th.numColor} font-mono`}>{form.numero}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Estado">
                  <Select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as OrdenCompra["estado"] })}>
                    {ESTADOS.map(e => <option key={e}>{e}</option>)}
                  </Select>
                </FormField>
                <FormField label="Moneda">
                  <Select value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value as OrdenCompra["moneda"] })}>
                    <option>ARS</option><option>USD</option><option>EUR</option>
                  </Select>
                </FormField>
              </div>

              <FormField label="Proveedor" required>
                <Input value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })} placeholder="Nombre del proveedor" autoFocus />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Dirección proveedor">
                  <Input value={form.direccionProveedor ?? ""} onChange={e => setForm({ ...form, direccionProveedor: e.target.value })} placeholder="Güemes 294, Gral. Gutiérrez" />
                </FormField>
                <FormField label="País / Ciudad">
                  <Input value={form.ciudadPaisProveedor ?? ""} onChange={e => setForm({ ...form, ciudadPaisProveedor: e.target.value })} placeholder="Mendoza, Argentina" />
                </FormField>
              </div>

              <FormField label="Descripción del insumo" required>
                <Input value={form.insumo} onChange={e => setForm({ ...form, insumo: e.target.value })} placeholder="Sal industrial, NaOH..." />
              </FormField>

              <div className="grid grid-cols-4 gap-3">
                <FormField label="Cantidad">
                  <Input type="number" value={form.cantidad || ""} onChange={e => setForm({ ...form, cantidad: +e.target.value })} />
                </FormField>
                <FormField label="Unidad">
                  <Input value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} placeholder="kg, lt, unid..." />
                </FormField>
                <FormField label="Precio unitario">
                  <Input type="number" value={form.precioUnitario || ""} onChange={e => setForm({ ...form, precioUnitario: +e.target.value })} />
                </FormField>
                <FormField label="IVA %">
                  <Select value={String(form.iva ?? 21)} onChange={e => setForm({ ...form, iva: +e.target.value })}>
                    <option value="0">0%</option>
                    <option value="10.5">10.5%</option>
                    <option value="21">21%</option>
                    <option value="27">27%</option>
                  </Select>
                </FormField>
              </div>

              {form.moneda !== "ARS" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">
                      Tipo de cambio ({form.moneda} → ARS)
                    </p>
                    <p className="text-xs text-amber-600">Ingresá la cotización utilizada al momento de emitir la OC</p>
                  </div>
                  <div className="w-44">
                    <Input
                      type="number"
                      value={form.tipoCambio || ""}
                      onChange={e => setForm({ ...form, tipoCambio: +e.target.value || undefined })}
                      placeholder="ej: 1.285,50"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Fecha emisión">
                  <Input type="date" value={form.fechaEmision} onChange={e => setForm({ ...form, fechaEmision: e.target.value })} />
                </FormField>
                <FormField label="Fecha entrega">
                  <Input type="date" value={form.fechaEntrega} onChange={e => setForm({ ...form, fechaEntrega: e.target.value })} />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="N° presupuesto / cotización">
                  <Input value={form.numPresupuesto ?? ""} onChange={e => setForm({ ...form, numPresupuesto: e.target.value })} placeholder="294/801" />
                </FormField>
                <FormField label="Fecha presupuesto">
                  <Input type="date" value={form.fechaPresupuesto ?? ""} onChange={e => setForm({ ...form, fechaPresupuesto: e.target.value })} />
                </FormField>
              </div>

              <FormField label="Condición de pago">
                <Textarea value={form.condicionPago ?? ""} onChange={e => setForm({ ...form, condicionPago: e.target.value })}
                  placeholder="15 días fecha factura. Transferencia bancaria CBU: 007021... Alias: XXXXX CUIT: XX-XXXXXXXX-X" />
              </FormField>

              <FormField label="Lugar de entrega">
                <Input value={form.lugarEntrega ?? ""} onChange={e => setForm({ ...form, lugarEntrega: e.target.value })}
                  placeholder="Ej: Planta Seville Cazorla – Ruta 38 km 434,5, La Rioja" />
              </FormField>

              {/* ── Documentos adjuntos (no se imprimen) ── */}
              {(() => {
                type Archivo = { url: string; nombre: string; tipo: string };
                const uploadFile = async (file: File): Promise<Archivo | null> => {
                  const fd = new FormData(); fd.append("file", file);
                  const res = await fetch("/api/upload", { method: "POST", body: fd });
                  return res.ok ? res.json() : null;
                };
                const DocRow = ({ archivo, onRemove }: { archivo: Archivo; onRemove: () => void }) => (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <FileText size={14} className="text-blue-500 flex-shrink-0" />
                    <span className="flex-1 text-xs text-blue-800 truncate">{archivo.nombre}</span>
                    <a href={archivo.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700"><ExternalLink size={13} /></a>
                    <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600"><X size={13} /></button>
                  </div>
                );
                const UploadZone = ({ label, onFile }: { label: string; onFile: (a: Archivo) => void }) => (
                  <label className="flex items-center gap-2 border border-dashed border-gray-300 hover:border-blue-400 rounded-lg px-3 py-2 cursor-pointer transition-colors group">
                    <Paperclip size={14} className="text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    <span className="text-xs text-gray-500 group-hover:text-blue-600">{label}</span>
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" className="hidden"
                      onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const a = await uploadFile(f); if (a) onFile(a); } }} />
                  </label>
                );
                return (
                  <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documentos adjuntos <span className="font-normal normal-case">(no se imprimen)</span></p>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-gray-600">Presupuesto</p>
                      {form.presupuestoArchivo
                        ? <DocRow archivo={form.presupuestoArchivo} onRemove={() => setForm(f => f ? { ...f, presupuestoArchivo: undefined } as OrdenCompra : null)} />
                        : <UploadZone label="Adjuntar presupuesto…" onFile={a => setForm(f => f ? { ...f, presupuestoArchivo: a } as OrdenCompra : null)} />}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-gray-600">Factura</p>
                      {form.facturaArchivo
                        ? <DocRow archivo={form.facturaArchivo} onRemove={() => setForm(f => f ? { ...f, facturaArchivo: undefined } as OrdenCompra : null)} />
                        : <UploadZone label="Adjuntar factura…" onFile={a => setForm(f => f ? { ...f, facturaArchivo: a } as OrdenCompra : null)} />}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-gray-600">Comprobante de pago</p>
                      {form.comprobantePagoArchivo
                        ? <DocRow archivo={form.comprobantePagoArchivo} onRemove={() => setForm(f => f ? { ...f, comprobantePagoArchivo: undefined } as OrdenCompra : null)} />
                        : <UploadZone label="Adjuntar comprobante de pago…" onFile={a => setForm(f => f ? { ...f, comprobantePagoArchivo: a } as OrdenCompra : null)} />}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-gray-600">Remitos de recepción</p>
                      {(form.remitosArchivos ?? []).map((r, i) => (
                        <DocRow key={i} archivo={r} onRemove={() => setForm(f => f ? { ...f, remitosArchivos: (f.remitosArchivos ?? []).filter((_, j) => j !== i) } as OrdenCompra : null)} />
                      ))}
                      <UploadZone label="Adjuntar remito…" onFile={a => setForm(f => f ? { ...f, remitosArchivos: [...(f.remitosArchivos ?? []), a] } as OrdenCompra : null)} />
                    </div>
                  </div>
                );
              })()}

              {form.cantidad > 0 && form.precioUnitario > 0 && (() => {
                const neto = form.cantidad * form.precioUnitario;
                const iva  = neto * ((form.iva ?? 21) / 100);
                return (
                  <div className={`${th.totalBg} border rounded-xl px-4 py-3 space-y-1`}>
                    <div className={`flex justify-between text-xs ${th.totalText}`}><span>Neto</span><span>{form.moneda} {neto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span></div>
                    {(form.iva ?? 21) > 0 && <div className={`flex justify-between text-xs ${th.totalText}`}><span>IVA {form.iva ?? 21}%</span><span>{form.moneda} {iva.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span></div>}
                    <div className={`flex justify-between font-bold pt-1 border-t ${th.totalBold}`}><span>Total</span><span className="text-xl">{form.moneda} {(neto + iva).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span></div>
                  </div>
                );
              })()}

              <FormField label="Justificación / Observaciones">
                <Textarea value={form.justificacion} onChange={e => setForm({ ...form, justificacion: e.target.value })}
                  placeholder="Precio, calidad, plazo de entrega, historial..." />
              </FormField>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-gray-50 rounded-b-2xl">
              <button onClick={closeModal} className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-100">Cancelar</button>
              <button onClick={handleSave}
                disabled={!form.proveedor.trim() || !form.insumo.trim()}
                className={`px-6 py-2 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2
                  ${saved ? "bg-green-500" : `${th.saveBtn} disabled:opacity-40`}`}>
                {saved ? <><CheckCircle2 size={16} /> Guardado</> : editing ? "Guardar cambios" : "Crear OC"}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal PDF */}
      {pdfOC && <ModalPDF oc={pdfOC} onClose={() => setPdfOC(null)} />}

      {/* Modal confirmación borrado */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
            <Trash2 size={24} className="text-red-500 mx-auto" />
            <div>
              <p className="font-bold text-gray-900">¿Eliminar esta OC?</p>
              <p className="text-sm text-gray-500 mt-1">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-50">Cancelar</button>
              <button onClick={() => { persist(items.filter(i => i.id !== deleteId)); setDeleteId(null); }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
