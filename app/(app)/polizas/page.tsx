"use client";
import { useEffect, useState } from "react";
import { loadData, saveData, Poliza, DestinaciónIT } from "@/lib/abastecimiento-store";
import { AlertTriangle, CheckCircle2, Plus, X, Edit2, Trash2, ChevronDown, ChevronUp, DollarSign, Clock, AlertCircle, XCircle, FileSpreadsheet, ExternalLink } from "lucide-react";
import FormField, { Input } from "@/components/abastecimiento/FormField";
import ExportModal, { type ExportOpts } from "@/components/abastecimiento/ExportModal";
import Link from "next/link";

// ─── helpers ────────────────────────────────────────────────────
const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

function dias(fecha: string): number | null {
  if (!fecha) return null;
  const d = new Date(fecha); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoy.getTime()) / 86400000);
}
function fmt(f: string) {
  if (!f) return "—";
  const [y, m, d] = f.split("-");
  return !y || !m || !d ? f : `${d}/${m}/${y}`;
}

// ─── lógica de estado recomendado ────────────────────────────────
type RecomendacionTipo = "baja" | "prorroga" | "decision" | "ok" | "sin-datos";

interface Recomendacion {
  tipo: RecomendacionTipo;
  titulo: string;
  detalle: string;
  urgente: boolean;
  color: string;
  bg: string;
  ring: string;
  icon: React.ReactNode;
}

function calcRecomendacion(poliza: Poliza, destinaciones: DestinaciónIT[]): Recomendacion {
  const dests = destinaciones.filter(d => poliza.destinacionesVinculadas.includes(d.numero));

  if (poliza.estado === "Baja solicitada") return {
    tipo: "ok", titulo: "Baja en trámite", detalle: `Solicitada el ${fmt(poliza.fechaGestion)}`,
    urgente: false, color: "text-gray-500", bg: "bg-gray-50", ring: "border-gray-200",
    icon: <Clock size={16} />,
  };
  if (poliza.estado === "Dada de baja") return {
    tipo: "ok", titulo: "Dada de baja", detalle: "Garantía devuelta",
    urgente: false, color: "text-gray-400", bg: "bg-gray-50", ring: "border-gray-200",
    icon: <CheckCircle2 size={16} />,
  };
  if (poliza.estado === "Prórroga solicitada") return {
    tipo: "ok", titulo: "Prórroga en trámite", detalle: `Solicitada el ${fmt(poliza.fechaGestion)}`,
    urgente: false, color: "text-olive-500", bg: "bg-olive-50", ring: "border-olive-200",
    icon: <Clock size={16} />,
  };

  if (dests.length === 0) return {
    tipo: "sin-datos", titulo: "Sin destinaciones vinculadas", detalle: "Asociar destinaciones para calcular estado automático",
    urgente: false, color: "text-gray-400", bg: "bg-gray-50", ring: "border-gray-200",
    icon: <AlertCircle size={16} />,
  };

  // ¿Todas con saldo = 0?
  const todasEnCero = dests.every(d => d.stockDocumental === 0);
  if (todasEnCero) return {
    tipo: "baja", titulo: "Solicitar BAJA",
    detalle: "Saldo MOA = 0 en todas las destinaciones. Solicitar baja y devolución de garantía para evitar prima mensual innecesaria.",
    urgente: true, color: "text-red-700", bg: "bg-red-50", ring: "border-red-400",
    icon: <XCircle size={16} />,
  };

  // Prórroga próxima a vencer (≤60 días) con saldo
  const prorrogaUrgente = dests.find(d => {
    if (d.stockDocumental <= 0) return false;
    if (!d.fechaVtoProrroga || d.fechaVtoProrroga === d.fechaVtoOriginal) return false;
    const d2 = dias(d.fechaVtoProrroga);
    return d2 !== null && d2 >= 0 && d2 <= 60;
  });
  if (prorrogaUrgente) {
    const d2 = dias(prorrogaUrgente.fechaVtoProrroga)!;
    return {
      tipo: "decision", titulo: "DECISIÓN URGENTE — prórroga por vencer",
      detalle: `Dest. ${prorrogaUrgente.numero}: prórroga vence en ${d2} días con saldo ${prorrogaUrgente.stockDocumental.toLocaleString()} ${prorrogaUrgente.unidad}. Decidir: exportar saldo o nacionalizar.`,
      urgente: true, color: "text-red-600", bg: "bg-red-50", ring: "border-red-400",
      icon: <AlertTriangle size={16} />,
    };
  }

  // Vto original próximo (≤60 días) sin prórroga, con saldo
  const vtoOrigUrgente = dests.find(d => {
    if (d.stockDocumental <= 0) return false;
    if (d.fechaVtoProrroga && d.fechaVtoProrroga !== d.fechaVtoOriginal) return false;
    const d2 = dias(d.fechaVencimiento);
    return d2 !== null && d2 >= 0 && d2 <= 60;
  });
  if (vtoOrigUrgente) {
    const d2 = dias(vtoOrigUrgente.fechaVencimiento)!;
    return {
      tipo: "prorroga", titulo: "Solicitar PRÓRROGA",
      detalle: `Dest. ${vtoOrigUrgente.numero}: vence en ${d2} días con saldo ${vtoOrigUrgente.stockDocumental.toLocaleString()} ${vtoOrigUrgente.unidad}. Gestionar prórroga antes del vencimiento.`,
      urgente: d2 <= 30, color: d2 <= 30 ? "text-orange-700" : "text-yellow-700",
      bg: d2 <= 30 ? "bg-orange-50" : "bg-yellow-50",
      ring: d2 <= 30 ? "border-orange-400" : "border-yellow-300",
      icon: <AlertTriangle size={16} />,
    };
  }

  return {
    tipo: "ok", titulo: "Sin acción urgente",
    detalle: `${dests.length} destinación(es) vigente(s) sin vencimientos críticos en los próximos 60 días.`,
    urgente: false, color: "text-green-700", bg: "bg-green-50", ring: "border-green-300",
    icon: <CheckCircle2 size={16} />,
  };
}

// ─── form vacío ───────────────────────────────────────────────────
const EMPTY: Omit<Poliza, "id"> = {
  numero: "", aseguradora: "", tipo: "Caución", destinacionesVinculadas: [],
  montoGarantiaARS: 0, montoGarantiaUSD: 0, primaARS: 0,
  fechaEmision: "", fechaVencimiento: "",
  estado: "Activa", fechaGestion: "", motivoBaja: "", observaciones: "",
};

// ─── componente ───────────────────────────────────────────────────
export default function PolizasPage() {
  const [polizas, setPolizas] = useState<Poliza[]>([]);
  const [destinaciones, setDestinaciones] = useState<DestinaciónIT[]>([]);
  const [modal, setModal] = useState<Poliza | "new" | null>(null);
  const [form, setForm] = useState<Omit<Poliza, "id">>(EMPTY);
  const [expandId, setExpandId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmarElim, setConfirmarElim] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [accionModal, setAccionModal] = useState<{ poliza: Poliza; tipo: "baja" | "prorroga" | "decision" } | null>(null);
  const [accionFecha, setAccionFecha] = useState("");
  const [accionMotivoNac, setAccionMotivoNac] = useState<"exportar" | "nacionalizar">("exportar");

  useEffect(() => {
    const d = loadData();
    setPolizas(d.polizas ?? []);
    setDestinaciones(d.destinaciones ?? []);
  }, []);

  const persist = (next: Poliza[]) => {
    const d = loadData(); d.polizas = next; saveData(d); setPolizas(next);
  };

  const sf = (f: string, v: any) => setForm(prev => ({ ...prev, [f]: v }));
  const fu = (f: string) => (form as any)[f] ?? "";

  const openNew = () => { setForm(EMPTY); setModal("new"); };
  const openEdit = (p: Poliza) => { setForm({ ...p }); setModal(p); };

  const handleSave = () => {
    if (modal === "new") {
      persist([...polizas, { ...form, id: `poliza-${Date.now()}` }]);
    } else if (modal) {
      persist(polizas.map(p => p.id === (modal as Poliza).id ? { ...form, id: (modal as Poliza).id } : p));
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); setModal(null); }, 800);
  };

  const ejecutarAccion = () => {
    if (!accionModal) return;
    const { poliza, tipo } = accionModal;
    let update: Partial<Poliza> = { fechaGestion: accionFecha };
    if (tipo === "baja") {
      update.estado = "Baja solicitada";
      update.motivoBaja = "Saldo cero - exportado";
    } else if (tipo === "prorroga") {
      update.estado = "Prórroga solicitada";
    } else {
      update.estado = "Baja solicitada";
      update.motivoBaja = accionMotivoNac === "nacionalizar" ? "Nacionalización" : "Saldo cero - exportado";
    }
    persist(polizas.map(p => p.id === poliza.id ? { ...p, ...update } : p));
    setAccionModal(null);
    setAccionFecha("");
  };

  // KPIs
  const primaTotal = polizas.filter(p => p.estado === "Activa" || p.estado === "Prórroga solicitada").reduce((s, p) => s + p.primaARS, 0);
  const recomendaciones = polizas.map(p => calcRecomendacion(p, destinaciones));
  const conAccion = recomendaciones.filter(r => r.tipo === "baja" || r.tipo === "prorroga" || r.tipo === "decision").length;
  const ahorroSiDanDeBaja = polizas
    .filter((p, i) => recomendaciones[i].tipo === "baja" && p.estado === "Activa")
    .reduce((s, p) => s + p.primaARS, 0);

  // Orden urgentes primero
  const ordenadas = [...polizas].map((p, i) => ({ p, r: recomendaciones[i] })).sort((a, b) => {
    const prio: Record<RecomendacionTipo, number> = { decision: 0, baja: 1, prorroga: 2, "sin-datos": 3, ok: 4 };
    return prio[a.r.tipo] - prio[b.r.tipo];
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pólizas de Caución</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-gray-500">
              {polizas.filter(p => p.estado === "Activa").length} activas ·{" "}
              {polizas.filter(p => p.estado === "Dada de baja").length} dadas de baja
            </p>
            <Link href="/destinaciones"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-olive-600 hover:text-olive-900 bg-olive-50 hover:bg-olive-100 px-2.5 py-1 rounded-lg transition-colors border border-olive-200">
              <Clock size={12} /> Ver destinaciones IT <ExternalLink size={10} />
            </Link>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-olive-600 hover:bg-olive-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <FileSpreadsheet size={15} /> Exportar
          </button>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-olive-600 hover:bg-olive-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus size={16} /> Nueva póliza
          </button>
        </div>
      </div>
      {exportOpen && (
        <ExportModal
          seccionesPreset={["polizas"]}
          onClose={() => setExportOpen(false)}
          onExport={async (opts: ExportOpts) => {
            const { exportToExcel } = await import("@/lib/abastecimiento/exportExcel");
            await exportToExcel(opts);
          }}
        />
      )}

      {/* Regla de oro */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <span className="font-bold">💡 Regla de oro:</span> Toda destinación con saldo MOA = 0 debe darse de baja cuanto antes.
        Cada día de demora es prima mensual pagada innecesariamente. Avisar al despachante con al menos <strong>60 días</strong> de anticipación para solicitar prórrogas.
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide flex items-center gap-1.5">
            <DollarSign size={13} /> Prima mensual activa
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {primaTotal > 0 ? `$${primaTotal.toLocaleString("es-AR")}` : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">suma pólizas Activa + Prórroga</p>
        </div>
        <div className={`rounded-xl border-2 p-4 ${ahorroSiDanDeBaja > 0 ? "bg-green-50 border-green-300" : "bg-white border-gray-200"}`}>
          <p className="text-xs font-medium uppercase tracking-wide flex items-center gap-1.5 text-green-700">
            <CheckCircle2 size={13} /> Ahorro potencial si se dan de baja
          </p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {ahorroSiDanDeBaja > 0 ? `$${ahorroSiDanDeBaja.toLocaleString("es-AR")}/mes` : "—"}
          </p>
          <p className="text-xs text-green-600 mt-0.5">pólizas con saldo 0 aún activas</p>
        </div>
        <div className={`rounded-xl border-2 p-4 ${conAccion > 0 ? "bg-red-50 border-red-300" : "bg-white border-gray-200"}`}>
          <p className={`text-xs font-medium uppercase tracking-wide flex items-center gap-1.5 ${conAccion > 0 ? "text-red-700" : "text-gray-400"}`}>
            <AlertTriangle size={13} /> Con acción pendiente
          </p>
          <p className={`text-2xl font-bold mt-1 ${conAccion > 0 ? "text-red-700" : "text-gray-500"}`}>{conAccion}</p>
          <p className={`text-xs mt-0.5 ${conAccion > 0 ? "text-red-500" : "text-gray-400"}`}>baja / prórroga / decisión urgente</p>
        </div>
      </div>

      {/* Sin pólizas */}
      {polizas.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <DollarSign size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500 text-lg">No hay pólizas registradas</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">Cargá las pólizas de caución vinculadas a tus destinaciones IT</p>
          <button onClick={openNew} className="px-5 py-2 bg-olive-600 text-white rounded-xl text-sm font-semibold">
            + Agregar primera póliza
          </button>
        </div>
      )}

      {/* Lista pólizas */}
      <div className="space-y-3">
        {ordenadas.map(({ p, r }) => {
          const expanded = expandId === p.id;
          const destsVinc = destinaciones.filter(d => p.destinacionesVinculadas.includes(d.numero));
          return (
            <div key={p.id} className={`bg-white rounded-xl border-2 ${r.ring} overflow-hidden transition-all`}>

              {/* Cabecera */}
              <div className="px-4 py-3 flex items-center gap-3">

                {/* Badge estado recomendado */}
                <div className={`shrink-0 rounded-lg px-2 py-1.5 text-center min-w-[4.5rem] ${r.bg}`}>
                  <div className={`flex items-center justify-center gap-1 ${r.color}`}>{r.icon}</div>
                  <p className={`text-xs font-bold mt-0.5 leading-tight ${r.color}`}>{
                    r.tipo === "baja" ? "BAJA" :
                    r.tipo === "prorroga" ? "PRÓRROGA" :
                    r.tipo === "decision" ? "DECISIÓN" :
                    r.tipo === "sin-datos" ? "S/DATOS" : "OK"
                  }</p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-gray-800">{p.numero || "—"}</span>
                    <span className="text-xs text-gray-400">{p.aseguradora}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.estado === "Activa" ? "bg-green-100 text-green-700" :
                      p.estado === "Baja solicitada" ? "bg-orange-100 text-orange-700" :
                      p.estado === "Dada de baja" ? "bg-gray-100 text-gray-500" :
                      "bg-olive-100 text-olive-600"
                    }`}>{p.estado}</span>
                  </div>
                  <div className={`mt-1 text-xs font-medium ${r.color} flex items-center gap-1`}>
                    {r.urgente && <AlertTriangle size={11} className="shrink-0" />}
                    {r.titulo}
                  </div>
                </div>

                {/* Datos económicos */}
                <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                  {p.primaARS > 0 && (
                    <p className="text-sm font-bold text-gray-800">
                      ${p.primaARS.toLocaleString("es-AR")}<span className="text-xs font-normal text-gray-400">/mes</span>
                    </p>
                  )}
                  {p.montoGarantiaUSD > 0 && <p className="text-xs text-gray-400">Garantía: USD {p.montoGarantiaUSD.toLocaleString()}</p>}
                  {p.destinacionesVinculadas.length > 0 && <p className="text-xs text-gray-400">{p.destinacionesVinculadas.length} dest.</p>}
                </div>

                {/* Botón acción rápida */}
                {r.tipo !== "ok" && r.tipo !== "sin-datos" && p.estado === "Activa" && (
                  <button
                    onClick={() => {
                      setAccionModal({ poliza: p, tipo: r.tipo as "baja" | "prorroga" | "decision" });
                      setAccionFecha(new Date().toISOString().slice(0, 10));
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors ${
                      r.tipo === "baja" ? "bg-red-600 hover:bg-red-700" :
                      r.tipo === "decision" ? "bg-orange-600 hover:bg-orange-700" :
                      "bg-yellow-600 hover:bg-yellow-700"
                    }`}>
                    {r.tipo === "baja" ? "Solicitar baja" : r.tipo === "decision" ? "Registrar decisión" : "Solicitar prórroga"}
                  </button>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandId(expanded ? null : p.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:bg-olive-100 hover:text-olive-600">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => setConfirmarElim(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Detalle recomendación */}
              {(r.tipo !== "ok" && r.tipo !== "sin-datos") && (
                <div className={`px-4 py-2 border-t ${r.bg} text-xs ${r.color} font-medium`}>
                  {r.detalle}
                </div>
              )}

              {/* Detalle expandido */}
              {expanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><p className="text-gray-400 uppercase tracking-wide font-medium">Emisión</p><p className="font-semibold text-gray-800 mt-0.5">{fmt(p.fechaEmision)}</p></div>
                    <div><p className="text-gray-400 uppercase tracking-wide font-medium">Vto. póliza</p><p className="font-semibold text-gray-800 mt-0.5">{fmt(p.fechaVencimiento)}</p></div>
                    <div><p className="text-gray-400 uppercase tracking-wide font-medium">Garantía</p><p className="font-semibold text-gray-800 mt-0.5">{p.montoGarantiaUSD > 0 ? `USD ${p.montoGarantiaUSD.toLocaleString()}` : "—"}</p></div>
                    <div><p className="text-gray-400 uppercase tracking-wide font-medium">Prima mensual</p><p className="font-semibold text-gray-800 mt-0.5">{p.primaARS > 0 ? `$${p.primaARS.toLocaleString("es-AR")}` : "—"}</p></div>
                    {p.fechaGestion && (
                      <div className="col-span-2">
                        <p className="text-gray-400 uppercase tracking-wide font-medium">Gestión registrada</p>
                        <p className="font-semibold mt-0.5">{fmt(p.fechaGestion)} — {p.estado}{p.motivoBaja ? ` (${p.motivoBaja})` : ""}</p>
                      </div>
                    )}
                  </div>

                  {/* Destinaciones vinculadas */}
                  {destsVinc.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Destinaciones vinculadas</p>
                      <div className="space-y-1.5">
                        {destsVinc.map(d => {
                          const dRest = dias(d.fechaVencimiento);
                          const colorDias = dRest === null ? "text-gray-400" :
                            dRest < 0 ? "text-red-600 font-bold" :
                            dRest <= 15 ? "text-red-600 font-bold" :
                            dRest <= 60 ? "text-orange-600 font-semibold" : "text-green-600";
                          return (
                            <div key={d.id} className="bg-white rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                              <div className="min-w-0">
                                <span className="font-mono font-semibold text-olive-600">{d.numero}</span>
                                <span className="text-gray-500 ml-2 truncate">{d.descripcion}</span>
                              </div>
                              <div className="flex items-center gap-4 text-right shrink-0">
                                <span className={`font-semibold ${d.stockDocumental === 0 ? "text-gray-400" : "text-yellow-700"}`}>
                                  {d.stockDocumental === 0 ? "Saldo 0" : `${d.stockDocumental.toLocaleString()} ${d.unidad}`}
                                </span>
                                <span className={colorDias}>
                                  {dRest === null ? "sin fecha" : dRest < 0 ? "VENCIDA" : `${dRest}d`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {p.observaciones && (
                    <div className="bg-white rounded-lg px-3 py-2 text-xs">
                      <p className="text-gray-400 uppercase font-medium">Observaciones</p>
                      <p className="text-gray-700 mt-0.5">{p.observaciones}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal nueva/editar póliza ── */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-6 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-bold text-gray-900">
                {modal === "new" ? "Nueva póliza de caución" : `Editar — ${(modal as Poliza).numero}`}
              </h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="N° Póliza">
                  <Input value={fu("numero")} onChange={e => sf("numero", e.target.value)} placeholder="ej: 0012345" />
                </FormField>
                <FormField label="Aseguradora">
                  <Input value={fu("aseguradora")} onChange={e => sf("aseguradora", e.target.value)} placeholder="ej: FIANZAS Y CRÉDITO" />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Monto garantía (USD)">
                  <Input type="number" value={fu("montoGarantiaUSD") || ""} min={0} onChange={e => sf("montoGarantiaUSD", +e.target.value)} />
                </FormField>
                <FormField label="Prima mensual (ARS)">
                  <Input type="number" value={fu("primaARS") || ""} min={0} onChange={e => sf("primaARS", +e.target.value)} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Fecha emisión">
                  <Input type="date" value={fu("fechaEmision")} onChange={e => sf("fechaEmision", e.target.value)} />
                </FormField>
                <FormField label="Vto. póliza">
                  <Input type="date" value={fu("fechaVencimiento")} onChange={e => sf("fechaVencimiento", e.target.value)} />
                </FormField>
              </div>
              <FormField label="Estado">
                <select value={fu("estado")} onChange={e => sf("estado", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400 bg-white">
                  {["Activa", "Prórroga solicitada", "Baja solicitada", "Dada de baja"].map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>

              {/* Selector de destinaciones */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                  Destinaciones vinculadas
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {destinaciones.map(d => {
                    const checked = (form.destinacionesVinculadas ?? []).includes(d.numero);
                    return (
                      <label key={d.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${checked ? "bg-olive-50" : ""}`}>
                        <input type="checkbox" checked={checked} onChange={e => {
                          const cur = form.destinacionesVinculadas ?? [];
                          sf("destinacionesVinculadas", e.target.checked ? [...cur, d.numero] : cur.filter(n => n !== d.numero));
                        }} className="rounded" />
                        <span className="font-mono text-xs text-olive-600 shrink-0">{d.numero}</span>
                        <span className="text-xs text-gray-600 flex-1 truncate">{d.descripcion}</span>
                        {d.stockDocumental === 0
                          ? <span className="text-xs text-gray-400 shrink-0">saldo 0</span>
                          : <span className="text-xs text-yellow-700 shrink-0 font-semibold">{d.stockDocumental.toLocaleString()} {d.unidad}</span>
                        }
                      </label>
                    );
                  })}
                </div>
              </div>

              <FormField label="Observaciones">
                <textarea value={fu("observaciones")} rows={2} onChange={e => sf("observaciones", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400 resize-none" />
              </FormField>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-olive-50/40 rounded-b-2xl sticky bottom-0">
              <button onClick={() => setModal(null)} className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-100">Cancelar</button>
              <button onClick={handleSave}
                className={`px-6 py-2 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${saved ? "bg-green-500" : "bg-olive-600 hover:bg-olive-700"}`}>
                {saved ? <><CheckCircle2 size={16} /> Guardado</> : (modal === "new" ? "Agregar" : "Guardar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal acción rápida ── */}
      {accionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">
                {accionModal.tipo === "baja" ? "🔴 Registrar solicitud de BAJA" :
                 accionModal.tipo === "prorroga" ? "🟡 Registrar solicitud de PRÓRROGA" :
                 "🟠 Registrar DECISIÓN — prórroga por vencer"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">Póliza: <strong>{accionModal.poliza.numero || "—"}</strong></p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <FormField label="Fecha de solicitud / gestión">
                <Input type="date" value={accionFecha} onChange={e => setAccionFecha(e.target.value)} />
              </FormField>

              {accionModal.tipo === "baja" && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
                  <p className="font-semibold text-sm mb-1">Acciones a realizar:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Comunicar al despachante la baja de la destinación</li>
                    <li>Solicitar la devolución de la garantía de la póliza</li>
                    <li>Confirmar con contabilidad el cese del débito mensual</li>
                  </ul>
                </div>
              )}

              {accionModal.tipo === "prorroga" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
                  <p className="font-semibold text-sm mb-1">Acciones a realizar:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Comunicar al despachante la solicitud de prórroga</li>
                    <li>Indicar el nuevo plazo estimado para exportar el saldo</li>
                    <li>Coordinar con Logística el plan de exportación</li>
                    <li>Actualizar la fecha Vto. Prórroga una vez aprobada</li>
                  </ul>
                </div>
              )}

              {accionModal.tipo === "decision" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Decisión tomada</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["exportar", "nacionalizar"] as const).map(op => (
                      <button key={op} type="button" onClick={() => setAccionMotivoNac(op)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${accionMotivoNac === op ? "border-olive-500 bg-olive-50 text-olive-600" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                        {op === "exportar" ? "🚢 Exportar saldo" : "🏭 Nacionalizar"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {accionMotivoNac === "exportar"
                      ? "Se coordinará con Logística para exportar el saldo antes del vencimiento de la prórroga."
                      : "Se iniciará el trámite de nacionalización ante ARCA. Se abonará el arancel correspondiente."}
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-olive-50/40 rounded-b-2xl">
              <button onClick={() => setAccionModal(null)} className="px-4 py-2 border border-gray-300 rounded-xl text-sm">Cancelar</button>
              <button onClick={ejecutarAccion} disabled={!accionFecha}
                className="px-5 py-2 bg-olive-600 hover:bg-olive-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold">
                Confirmar y registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminación */}
      {confirmarElim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-gray-900 mb-2">Eliminar póliza</h3>
            <p className="text-sm text-gray-600 mb-5">¿Confirmar eliminación?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmarElim(null)} className="px-4 py-2 border border-gray-300 rounded-xl text-sm">Cancelar</button>
              <button onClick={() => { persist(polizas.filter(p => p.id !== confirmarElim)); setConfirmarElim(null); }}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
