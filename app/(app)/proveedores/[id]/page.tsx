"use client";
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  loadData, saveData, Proveedor, Cotizacion, PrecioNegociado, OrdenCompra,
  DocumentoProveedor, NivelDocumento,
  estadoDocumento, estadoHomologacion, checklistBRCGS, TipoInsumo, uid,
} from "@/lib/abastecimiento-store";
import FormField, { Input, Select, Textarea } from "@/components/abastecimiento/FormField";
import { ArrowLeft, Plus, Trash2, Star, ShieldCheck, ShieldOff, X, CheckCircle2, Upload, FileText, ExternalLink, AlertTriangle, FolderOpen } from "lucide-react";

type Tab = "datos" | "cotizaciones" | "negociados" | "ocs" | "legajo";

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={14} className={n <= value ? "text-yellow-400" : "text-gray-200"} fill={n <= value ? "currentColor" : "none"} />
      ))}
    </div>
  );
}

const calcUSD = (precio: number, moneda: string, tc: number): number => {
  if (moneda === "USD") return precio;
  if (moneda === "EUR") return precio * 1.08;
  return tc > 0 ? precio / tc : 0;
};

const emptyCotiz = (): Cotizacion => ({
  id: uid(),
  fecha: new Date().toISOString().slice(0, 10),
  insumo: "", unidad: "", cantidad: 0,
  precio: 0, moneda: "ARS", tc: 0, precioUSD: 0,
  vigente: true, observaciones: "",
});

const emptyNeg = (): PrecioNegociado => ({
  id: uid(),
  fecha: new Date().toISOString().slice(0, 10),
  insumo: "", unidad: "",
  precio: 0, moneda: "ARS", tc: 0, precioUSD: 0,
  validoHasta: "", observaciones: "",
});

const nivelLabel: Record<NivelDocumento, string> = {
  obligatorio: "🔴 Obligatorio",
  recomendado: "🟠 Recomendado",
  complementario: "🟡 Complementario",
};

const nivelColor: Record<NivelDocumento, string> = {
  obligatorio: "bg-red-50 border-red-200 text-red-700",
  recomendado: "bg-orange-50 border-orange-200 text-orange-700",
  complementario: "bg-yellow-50 border-yellow-200 text-yellow-700",
};

function EstadoBadge({ estado }: { estado: ReturnType<typeof estadoDocumento> }) {
  const map = {
    vigente:      "bg-green-100 text-green-700",
    por_vencer:   "bg-yellow-100 text-yellow-700",
    vencido:      "bg-red-100 text-red-600",
    pendiente:    "bg-gray-100 text-gray-500",
  } as const;
  const icon = { vigente: "✅", por_vencer: "⚠️", vencido: "❌", pendiente: "📂" } as const;
  const label = { vigente: "Vigente", por_vencer: "Por vencer", vencido: "Vencido", pendiente: "Pendiente" } as const;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${map[estado]}`}>
      {icon[estado]} {label[estado]}
    </span>
  );
}

const TIPO_OPTIONS: { value: TipoInsumo; label: string }[] = [
  { value: "quimico",            label: "Químico / Aditivo" },
  { value: "lubricante",         label: "Lubricante grado alimentario" },
  { value: "reactivo",           label: "Reactivo / Analítico" },
  { value: "contacto_alimento",  label: "Material en contacto con alimento" },
  { value: "auxiliar_sin_contacto", label: "Auxiliar sin contacto con alimento" },
  { value: "servicio",           label: "Servicio / Laboratorio" },
  { value: "materia_prima",      label: "Materia prima" },
  { value: "otro",               label: "Otro" },
];

export default function ProveedorDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [prov, setProv]         = useState<Proveedor | null>(null);
  const [tab, setTab]           = useState<Tab>("datos");
  const [cotizForm, setCotizForm] = useState<Cotizacion>(emptyCotiz());
  const [negForm, setNegForm]   = useState<PrecioNegociado>(emptyNeg());
  const [showCotiz, setShowCotiz] = useState(false);
  const [showNeg, setShowNeg]   = useState(false);
  const [editCotizId, setEditCotizId] = useState<string | null>(null);
  const [editNegId, setEditNegId]     = useState<string | null>(null);
  const [ocs, setOcs]           = useState<OrdenCompra[]>([]);
  const [saved, setSaved]       = useState<"cotiz"|"neg"|null>(null);

  // Legajo state
  const [tipoInsumo, setTipoInsumo]   = useState<TipoInsumo>("otro");
  const [editDocId, setEditDocId]     = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [legajoSaved, setLegajoSaved] = useState(false);

  useEffect(() => {
    const d = loadData();
    const p = (d.proveedores ?? []).find(p => p.id === id);
    if (p) setProv({ ...p, cotizaciones: p.cotizaciones ?? [], preciosNegociados: (p as any).preciosNegociados ?? [], documentos: (p as any).documentos ?? [] });
    setOcs(d.ordenesCompra.filter(o => o.proveedor.toLowerCase().includes((p?.razonSocial ?? "").toLowerCase()) || o.proveedor === p?.razonSocial));
  }, [id]);

  const persistProv = (updated: Proveedor) => {
    const d = loadData();
    d.proveedores = (d.proveedores ?? []).map(p => p.id === id ? updated : p);
    saveData(d);
    setProv(updated);
  };

  // ── Cotizaciones ──────────────────────────────────────────────────────────
  const saveCotiz = () => {
    if (!prov || !cotizForm.insumo.trim()) return;
    const c = { ...cotizForm, precioUSD: calcUSD(cotizForm.precio, cotizForm.moneda, cotizForm.tc) };
    const list = editCotizId
      ? prov.cotizaciones.map(x => x.id === editCotizId ? c : x)
      : [...prov.cotizaciones, c];
    persistProv({ ...prov, cotizaciones: list });
    setShowCotiz(false); setEditCotizId(null); setCotizForm(emptyCotiz());
    setSaved("cotiz"); setTimeout(() => setSaved(null), 1500);
  };

  const deleteCotiz = (cid: string) => {
    if (!prov) return;
    persistProv({ ...prov, cotizaciones: prov.cotizaciones.filter(c => c.id !== cid) });
  };

  // ── Precios Negociados ────────────────────────────────────────────────────
  const saveNeg = () => {
    if (!prov || !negForm.insumo.trim()) return;
    const n = { ...negForm, precioUSD: calcUSD(negForm.precio, negForm.moneda, negForm.tc) };
    const list = editNegId
      ? prov.preciosNegociados.map(x => x.id === editNegId ? n : x)
      : [...prov.preciosNegociados, n];
    persistProv({ ...prov, preciosNegociados: list });
    setShowNeg(false); setEditNegId(null); setNegForm(emptyNeg());
    setSaved("neg"); setTimeout(() => setSaved(null), 1500);
  };

  const deleteNeg = (nid: string) => {
    if (!prov) return;
    persistProv({ ...prov, preciosNegociados: prov.preciosNegociados.filter(n => n.id !== nid) });
  };

  // ── Legajo helpers ────────────────────────────────────────────────────────
  const docs = prov?.documentos ?? [];

  const initChecklist = () => {
    if (!prov) return;
    const base = checklistBRCGS(tipoInsumo);
    const nuevos: DocumentoProveedor[] = base.map(d => ({ ...d, id: uid() }));
    const merged = [
      ...docs,
      ...nuevos.filter(n => !docs.some(d => d.nombre === n.nombre)),
    ];
    persistProv({ ...prov, documentos: merged });
  };

  const updateDoc = (updated: DocumentoProveedor) => {
    if (!prov) return;
    persistProv({ ...prov, documentos: docs.map(d => d.id === updated.id ? updated : d) });
  };

  const deleteDoc = (did: string) => {
    if (!prov) return;
    persistProv({ ...prov, documentos: docs.filter(d => d.id !== did) });
  };

  const addDocManual = () => {
    if (!prov) return;
    const nuevo: DocumentoProveedor = {
      id: uid(),
      nombre: "Nuevo documento",
      nivel: "obligatorio",
    };
    persistProv({ ...prov, documentos: [...docs, nuevo] });
    setEditDocId(nuevo.id);
  };

  const handleFileUpload = async (docId: string, file: File) => {
    setUploadingId(docId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      const doc = docs.find(d => d.id === docId);
      if (doc) updateDoc({ ...doc, archivo: { url: data.url, nombre: data.nombre, tipo: data.tipo } });
    } finally {
      setUploadingId(null);
    }
  };

  const homolStatus = prov ? estadoHomologacion(prov) : null;
  const homolColors: Record<string, string> = {
    aprobado:   "bg-green-100 text-green-700 border-green-300",
    condicional:"bg-yellow-100 text-yellow-700 border-yellow-300",
    no_aprobado:"bg-red-100 text-red-700 border-red-300",
    en_proceso: "bg-blue-100 text-blue-700 border-blue-300",
  };
  const homolLabels: Record<string, string> = {
    aprobado:    "✅ APROBADO",
    condicional: "⚠️ CONDICIONAL",
    no_aprobado: "❌ NO APROBADO",
    en_proceso:  "🔄 EN PROCESO",
  };

  const docsPorVencer = docs.filter(d => estadoDocumento(d) === "por_vencer");

  if (!prov) return (
    <div className="max-w-4xl mx-auto pt-10 text-center text-gray-400">
      <p>Proveedor no encontrado.</p>
      <button onClick={() => router.push("/proveedores")} className="mt-4 text-olive-600 text-sm hover:underline">← Volver</button>
    </div>
  );

  const diasHomol = prov.vencimientoHomologacion
    ? Math.round((new Date(prov.vencimientoHomologacion).getTime() - Date.now()) / 86400000)
    : null;

  const totalOCs = ocs.reduce((s, o) => {
    const usd = o.moneda === "USD" ? o.cantidad * o.precioUnitario : 0;
    return s + usd;
  }, 0);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "datos",       label: "Datos generales" },
    { key: "cotizaciones",label: "Cotizaciones",     count: prov.cotizaciones.length },
    { key: "negociados",  label: "Precios negociados", count: prov.preciosNegociados.length },
    { key: "ocs",         label: "OCs vinculadas",   count: ocs.length },
    { key: "legajo",      label: "Legajo / Documentos", count: docs.length || undefined },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.push("/proveedores")}
          className="p-2 rounded-lg text-gray-400 hover:text-olive-600 hover:bg-olive-50 transition-colors mt-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">{prov.razonSocial}</h2>
            <span className="text-sm text-gray-400 font-mono">{prov.codigo}</span>
            {prov.homologado && diasHomol !== null && diasHomol >= 0 && (
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${diasHomol < 60 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                <ShieldCheck size={12} /> {diasHomol < 60 ? `Vence en ${diasHomol}d` : "Homologado"}
              </span>
            )}
            {prov.homologado && diasHomol !== null && diasHomol < 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                <ShieldOff size={12} /> Homol. vencida
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Stars value={prov.calificacion} />
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-olive-50 text-olive-600">{prov.tipo}</span>
            {prov.categorias.slice(0, 3).map(c => (
              <span key={c} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key ? "border-olive-500 text-olive-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Datos generales ── */}
      {tab === "datos" && (
        <div className="grid grid-cols-2 gap-4">
          {[
            ["País", prov.pais],
            ["CUIT / Tax ID", prov.cuit],
            ["Contacto", prov.contacto],
            ["Email", prov.email],
            ["Teléfono", prov.telefono],
            ["Condición de pago", prov.condicionPago],
            ["Moneda habitual", prov.moneda],
            ["Plazo entrega", prov.plazoEntregaDias ? `${prov.plazoEntregaDias} días` : "—"],
          ].map(([label, val]) => val ? (
            <div key={label} className="bg-olive-50/60 border border-olive-100 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{val}</p>
            </div>
          ) : null)}
          {prov.homologado && (
            <div className="col-span-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Homologación</p>
              <div className="flex gap-6 mt-1 text-sm text-green-800">
                <span>N°: <b>{prov.numeroHomologacion || "—"}</b></span>
                <span>Fecha: <b>{prov.fechaHomologacion || "—"}</b></span>
                <span>Vence: <b>{prov.vencimientoHomologacion || "—"}</b></span>
              </div>
            </div>
          )}
          {prov.observaciones && (
            <div className="col-span-2 bg-olive-50/60 border border-olive-100 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Observaciones</p>
              <p className="text-sm text-gray-700 mt-0.5">{prov.observaciones}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Cotizaciones ── */}
      {tab === "cotizaciones" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Historial de cotizaciones recibidas</p>
            <button onClick={() => { setCotizForm(emptyCotiz()); setEditCotizId(null); setShowCotiz(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-olive-600 hover:bg-olive-700 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all">
              <Plus size={15} /> Nueva cotización
            </button>
          </div>

          {prov.cotizaciones.length > 0 ? (
            <div className="bg-olive-50/60 border border-olive-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-olive-100">
                  <tr>
                    {["Fecha","Insumo","Cantidad","Precio","Moneda","TC","Precio USD","Estado",""].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...prov.cotizaciones].sort((a,b) => b.fecha.localeCompare(a.fecha)).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-xs text-gray-500">{c.fecha}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">{c.insumo}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">{c.cantidad} {c.unidad}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{c.precio.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{c.moneda}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{c.tc > 0 ? c.tc.toLocaleString() : "—"}</td>
                      <td className="px-3 py-2.5 font-semibold text-olive-600">
                        {c.precioUSD > 0 ? `USD ${c.precioUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.vigente ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                          {c.vigente ? "Vigente" : "Histórica"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => { setCotizForm({ ...c }); setEditCotizId(c.id); setShowCotiz(true); }}
                            className="p-1 rounded text-gray-400 hover:text-olive-600 hover:bg-olive-50 transition-colors">✏️</button>
                          <button onClick={() => deleteCotiz(c.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl py-10 text-center text-gray-400">
              <p className="font-medium">Sin cotizaciones cargadas</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Precios Negociados ── */}
      {tab === "negociados" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Precios acordados y vigentes por insumo</p>
            <button onClick={() => { setNegForm(emptyNeg()); setEditNegId(null); setShowNeg(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-olive-600 hover:bg-olive-700 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all">
              <Plus size={15} /> Nuevo precio
            </button>
          </div>

          {prov.preciosNegociados.length > 0 ? (
            <div className="bg-olive-50/60 border border-olive-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-olive-100">
                  <tr>
                    {["Fecha","Insumo","Unidad","Precio","Moneda","TC","Precio USD","Válido hasta",""].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...prov.preciosNegociados].sort((a,b) => b.fecha.localeCompare(a.fecha)).map(n => {
                    const vencido = n.validoHasta && new Date(n.validoHasta) < new Date();
                    return (
                      <tr key={n.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-xs text-gray-500">{n.fecha}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900">{n.insumo}</td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{n.unidad}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-800">{n.precio.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{n.moneda}</td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{n.tc > 0 ? n.tc.toLocaleString() : "—"}</td>
                        <td className="px-3 py-2.5 font-bold text-olive-600">
                          {n.precioUSD > 0 ? `USD ${n.precioUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs font-semibold ${vencido ? "text-red-500" : "text-green-600"}`}>
                            {n.validoHasta || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => { setNegForm({ ...n }); setEditNegId(n.id); setShowNeg(true); }}
                              className="p-1 rounded text-gray-400 hover:text-olive-600 hover:bg-olive-50 transition-colors">✏️</button>
                            <button onClick={() => deleteNeg(n.id)}
                              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl py-10 text-center text-gray-400">
              <p className="font-medium">Sin precios negociados cargados</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: OCs vinculadas ── */}
      {tab === "ocs" && (
        <div className="space-y-4">
          {ocs.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-olive-50 border border-olive-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-xl font-bold text-olive-600">{ocs.length}</p>
                  <p className="text-xs font-semibold text-olive-500">OCs totales</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-xl font-bold text-green-700">{ocs.filter(o => o.estado === "Recibida").length}</p>
                  <p className="text-xs font-semibold text-green-500">Recibidas</p>
                </div>
                <div className="bg-olive-50 border border-olive-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-xl font-bold text-olive-600">USD {totalOCs.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs font-semibold text-olive-500">Monto USD (OCs en USD)</p>
                </div>
              </div>
              <div className="bg-olive-50/60 border border-olive-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-olive-100">
                    <tr>
                      {["N° OC","Insumo","Cantidad","Precio Unit.","Moneda","TC","Monto USD","F. Emisión","Estado"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ocs.map(o => {
                      const usd = o.moneda === "USD" ? o.cantidad * o.precioUnitario : 0;
                      const estadoColor: Record<string, string> = { Recibida: "text-green-600", Pendiente: "text-yellow-600", Parcial: "text-orange-500", Cancelada: "text-red-500" };
                      return (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2.5 font-mono text-xs text-gray-500 font-semibold">{o.numero}</td>
                          <td className="px-3 py-2.5 font-medium text-gray-900">{o.insumo}</td>
                          <td className="px-3 py-2.5 text-gray-600 text-xs">{o.cantidad.toLocaleString()} {o.unidad}</td>
                          <td className="px-3 py-2.5 text-gray-700">{o.precioUnitario.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-gray-500 text-xs">{o.moneda}</td>
                          <td className="px-3 py-2.5 text-gray-400 text-xs">—</td>
                          <td className="px-3 py-2.5 font-semibold text-olive-600">
                            {usd > 0 ? `USD ${usd.toLocaleString()}` : `${o.moneda} ${(o.cantidad * o.precioUnitario).toLocaleString()}`}
                          </td>
                          <td className="px-3 py-2.5 text-gray-400 text-xs">{o.fechaEmision}</td>
                          <td className="px-3 py-2.5 font-semibold text-xs">
                            <span className={estadoColor[o.estado]}>{o.estado}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl py-10 text-center text-gray-400">
              <p className="font-medium">Sin OCs vinculadas</p>
              <p className="text-sm mt-1">Las OCs se vinculan por nombre de proveedor desde el módulo Compras Nacionales</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Legajo / Documentos ── */}
      {tab === "legajo" && (
        <div className="space-y-5">

          {/* Estado de homologación */}
          {homolStatus && (
            <div className={`flex items-center justify-between px-5 py-3 rounded-xl border font-semibold ${homolColors[homolStatus]}`}>
              <span className="text-sm">Estado de homologación BRCGS</span>
              <span className="text-base">{homolLabels[homolStatus]}</span>
            </div>
          )}

          {/* Alertas por vencer */}
          {docsPorVencer.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 space-y-1">
              <div className="flex items-center gap-2 text-yellow-700 font-semibold text-sm">
                <AlertTriangle size={15} /> Documentos próximos a vencer (≤ 60 días)
              </div>
              {docsPorVencer.map(d => {
                const dias = d.fechaVencimiento
                  ? Math.round((new Date(d.fechaVencimiento).getTime() - Date.now()) / 86400000)
                  : null;
                return (
                  <p key={d.id} className="text-xs text-yellow-700 ml-5">
                    • <b>{d.nombre}</b> — vence el {d.fechaVencimiento} ({dias !== null ? `en ${dias} días` : ""})
                  </p>
                );
              })}
            </div>
          )}

          {/* Inicializar checklist BRCGS */}
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <FolderOpen size={16} className="text-blue-500 shrink-0" />
            <p className="text-sm text-blue-700 flex-1">Inicializar checklist BRCGS según tipo de insumo:</p>
            <select
              value={tipoInsumo}
              onChange={e => setTipoInsumo(e.target.value as TipoInsumo)}
              className="text-sm border border-blue-300 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              onClick={initChecklist}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Cargar checklist
            </button>
          </div>

          {/* Resumen por nivel */}
          {docs.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {(["obligatorio","recomendado","complementario"] as NivelDocumento[]).map(nivel => {
                const grupo = docs.filter(d => d.nivel === nivel);
                const vigentes = grupo.filter(d => estadoDocumento(d) === "vigente").length;
                const pendientes = grupo.filter(d => estadoDocumento(d) === "pendiente").length;
                const vencidos  = grupo.filter(d => estadoDocumento(d) === "vencido").length;
                return (
                  <div key={nivel} className={`rounded-xl border px-4 py-3 ${nivelColor[nivel]}`}>
                    <p className="text-xs font-bold uppercase tracking-wide">{nivelLabel[nivel]}</p>
                    <p className="text-lg font-bold mt-1">{grupo.length} docs</p>
                    <p className="text-xs mt-0.5">{vigentes} vigentes · {pendientes} pendientes · {vencidos} vencidos</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lista de documentos */}
          <div className="space-y-2">
            {docs.map(doc => {
              const estado = estadoDocumento(doc);
              const isEditing = editDocId === doc.id;
              return (
                <div key={doc.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${nivelColor[doc.nivel]}`}>
                      {doc.nivel === "obligatorio" ? "🔴" : doc.nivel === "recomendado" ? "🟠" : "🟡"}
                    </span>

                    {isEditing ? (
                      <input
                        autoFocus
                        className="flex-1 text-sm font-medium text-gray-900 border-b border-olive-400 bg-transparent outline-none"
                        value={doc.nombre}
                        onChange={e => updateDoc({ ...doc, nombre: e.target.value })}
                        onBlur={() => setEditDocId(null)}
                        onKeyDown={e => e.key === "Enter" && setEditDocId(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setEditDocId(doc.id)}
                        className="flex-1 text-sm font-medium text-gray-900 text-left hover:text-olive-700 transition-colors"
                      >
                        {doc.nombre}
                      </button>
                    )}

                    <EstadoBadge estado={estado} />

                    {/* Archivo */}
                    {doc.archivo ? (
                      <a href={doc.archivo.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <FileText size={13} /> {doc.archivo.nombre.slice(0, 20)}{doc.archivo.nombre.length > 20 ? "…" : ""}
                        <ExternalLink size={11} />
                      </a>
                    ) : (
                      <label className="flex items-center gap-1 text-xs text-gray-400 hover:text-olive-600 cursor-pointer transition-colors">
                        {uploadingId === doc.id ? (
                          <span className="text-xs text-olive-500 animate-pulse">Subiendo...</span>
                        ) : (
                          <><Upload size={13} /> Adjuntar</>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(doc.id, f); e.target.value = ""; }}
                        />
                      </label>
                    )}

                    <button onClick={() => deleteDoc(doc.id)}
                      className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Fila de fechas y nivel — desplegable inline */}
                  <div className="bg-gray-50 border-t border-gray-100 px-4 py-2.5 flex items-center gap-5 flex-wrap">
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      Nivel:
                      <select
                        value={doc.nivel}
                        onChange={e => updateDoc({ ...doc, nivel: e.target.value as NivelDocumento })}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-700 focus:outline-none"
                      >
                        <option value="obligatorio">🔴 Obligatorio</option>
                        <option value="recomendado">🟠 Recomendado</option>
                        <option value="complementario">🟡 Complementario</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      Emisión:
                      <input type="date" value={doc.fechaEmision ?? ""}
                        onChange={e => updateDoc({ ...doc, fechaEmision: e.target.value })}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-700 focus:outline-none" />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      Vencimiento:
                      <input type="date" value={doc.fechaVencimiento ?? ""}
                        onChange={e => updateDoc({ ...doc, fechaVencimiento: e.target.value })}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-700 focus:outline-none" />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 flex-1">
                      Observaciones:
                      <input type="text" value={doc.observaciones ?? ""}
                        onChange={e => updateDoc({ ...doc, observaciones: e.target.value })}
                        placeholder="Notas..."
                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-0.5 bg-white text-gray-700 focus:outline-none" />
                    </label>
                    {doc.archivo && (
                      <button onClick={() => updateDoc({ ...doc, archivo: undefined })}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors">
                        Quitar archivo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón agregar documento manual */}
          <button
            onClick={addDocManual}
            className="flex items-center gap-2 w-full border-2 border-dashed border-gray-300 hover:border-olive-400 text-gray-400 hover:text-olive-600 rounded-xl py-3 justify-center text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Agregar documento manual
          </button>

          {docs.length === 0 && (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl py-10 text-center text-gray-400">
              <FolderOpen size={32} className="mx-auto mb-2 opacity-40" />
              <p className="font-medium">Sin documentos cargados</p>
              <p className="text-sm mt-1">Usá el checklist BRCGS o agregá documentos manualmente</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Cotización ── */}
      {showCotiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">{editCotizId ? "Editar cotización" : "Nueva cotización"}</h3>
              <button onClick={() => setShowCotiz(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Fecha">
                  <Input type="date" value={cotizForm.fecha} onChange={e => setCotizForm({ ...cotizForm, fecha: e.target.value })} />
                </FormField>
                <FormField label="Insumo" required>
                  <Input value={cotizForm.insumo} onChange={e => setCotizForm({ ...cotizForm, insumo: e.target.value })} placeholder="Sal, NaOH, film..." autoFocus />
                </FormField>
                <FormField label="Cantidad">
                  <Input type="number" value={cotizForm.cantidad || ""} onChange={e => setCotizForm({ ...cotizForm, cantidad: +e.target.value })} />
                </FormField>
                <FormField label="Unidad">
                  <Input value={cotizForm.unidad} onChange={e => setCotizForm({ ...cotizForm, unidad: e.target.value })} placeholder="kg, unid..." />
                </FormField>
                <FormField label="Precio">
                  <Input type="number" value={cotizForm.precio || ""} onChange={e => setCotizForm({ ...cotizForm, precio: +e.target.value })} />
                </FormField>
                <FormField label="Moneda">
                  <Select value={cotizForm.moneda} onChange={e => setCotizForm({ ...cotizForm, moneda: e.target.value as Cotizacion["moneda"] })}>
                    <option>ARS</option><option>USD</option><option>EUR</option>
                  </Select>
                </FormField>
                {cotizForm.moneda === "ARS" && (
                  <FormField label="Tipo de Cambio (ARS/USD)">
                    <Input type="number" value={cotizForm.tc || ""} onChange={e => setCotizForm({ ...cotizForm, tc: +e.target.value })} placeholder="ej: 1200" />
                  </FormField>
                )}
              </div>
              {cotizForm.precio > 0 && (
                <div className="bg-olive-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-olive-600 font-medium">Equivalente USD</span>
                  <span className="text-lg font-bold text-olive-600">
                    {cotizForm.moneda === "USD"
                      ? `USD ${cotizForm.precio.toLocaleString()}`
                      : cotizForm.tc > 0
                        ? `USD ${(cotizForm.precio / cotizForm.tc).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : "Ingresá el TC"}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between bg-olive-50/40 rounded-xl px-4 py-3">
                <span className="text-sm font-medium text-gray-700">¿Cotización vigente?</span>
                <button type="button" onClick={() => setCotizForm({ ...cotizForm, vigente: !cotizForm.vigente })}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${cotizForm.vigente ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                  {cotizForm.vigente ? "Vigente" : "Histórica"}
                </button>
              </div>
              <FormField label="Observaciones">
                <Textarea value={cotizForm.observaciones} onChange={e => setCotizForm({ ...cotizForm, observaciones: e.target.value })} placeholder="Condiciones, plazo de entrega, notas..." />
              </FormField>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-olive-50/40 rounded-b-2xl">
              <button onClick={() => setShowCotiz(false)} className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={saveCotiz} disabled={!cotizForm.insumo.trim()}
                className={`px-6 py-2 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${saved === "cotiz" ? "bg-green-500" : "bg-olive-600 hover:bg-olive-700 disabled:opacity-40 disabled:cursor-not-allowed"}`}>
                {saved === "cotiz" ? <><CheckCircle2 size={16} /> Guardado</> : "Guardar cotización"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Precio Negociado ── */}
      {showNeg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">{editNegId ? "Editar precio negociado" : "Nuevo precio negociado"}</h3>
              <button onClick={() => setShowNeg(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Fecha">
                  <Input type="date" value={negForm.fecha} onChange={e => setNegForm({ ...negForm, fecha: e.target.value })} />
                </FormField>
                <FormField label="Válido hasta">
                  <Input type="date" value={negForm.validoHasta} onChange={e => setNegForm({ ...negForm, validoHasta: e.target.value })} />
                </FormField>
                <FormField label="Insumo" required>
                  <Input value={negForm.insumo} onChange={e => setNegForm({ ...negForm, insumo: e.target.value })} placeholder="Nombre del insumo" autoFocus />
                </FormField>
                <FormField label="Unidad">
                  <Input value={negForm.unidad} onChange={e => setNegForm({ ...negForm, unidad: e.target.value })} placeholder="kg, unid..." />
                </FormField>
                <FormField label="Precio negociado">
                  <Input type="number" value={negForm.precio || ""} onChange={e => setNegForm({ ...negForm, precio: +e.target.value })} />
                </FormField>
                <FormField label="Moneda">
                  <Select value={negForm.moneda} onChange={e => setNegForm({ ...negForm, moneda: e.target.value as PrecioNegociado["moneda"] })}>
                    <option>ARS</option><option>USD</option><option>EUR</option>
                  </Select>
                </FormField>
                {negForm.moneda === "ARS" && (
                  <FormField label="Tipo de Cambio (ARS/USD)">
                    <Input type="number" value={negForm.tc || ""} onChange={e => setNegForm({ ...negForm, tc: +e.target.value })} placeholder="ej: 1200" />
                  </FormField>
                )}
              </div>
              {negForm.precio > 0 && (
                <div className="bg-olive-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-olive-600 font-medium">Equivalente USD</span>
                  <span className="text-lg font-bold text-olive-600">
                    {negForm.moneda === "USD"
                      ? `USD ${negForm.precio.toLocaleString()}`
                      : negForm.tc > 0
                        ? `USD ${(negForm.precio / negForm.tc).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : "Ingresá el TC"}
                  </span>
                </div>
              )}
              <FormField label="Observaciones">
                <Textarea value={negForm.observaciones} onChange={e => setNegForm({ ...negForm, observaciones: e.target.value })} placeholder="Condiciones acordadas, descuentos, volumen mínimo..." />
              </FormField>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-olive-50/40 rounded-b-2xl">
              <button onClick={() => setShowNeg(false)} className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={saveNeg} disabled={!negForm.insumo.trim()}
                className={`px-6 py-2 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${saved === "neg" ? "bg-green-500" : "bg-olive-600 hover:bg-olive-700 disabled:opacity-40 disabled:cursor-not-allowed"}`}>
                {saved === "neg" ? <><CheckCircle2 size={16} /> Guardado</> : "Guardar precio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
