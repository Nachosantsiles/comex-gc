"use client";
import { useEffect, useState } from "react";
import { loadData, saveData, DestinaciónIT, Poliza, vencimientoEfectivo, getPolizaDeDestinacion } from "@/lib/abastecimiento-store";
import { AlertTriangle, Clock, CheckCircle2, Plus, X, ChevronDown, ChevronUp, Edit2, Trash2, FileSpreadsheet, Shield, ExternalLink } from "lucide-react";
import Link from "next/link";
import FormField, { Input } from "@/components/abastecimiento/FormField";
import ExportModal, { type ExportOpts } from "@/components/abastecimiento/ExportModal";

const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

function fmt(fecha: string): string {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}

function diasRestantes(fecha: string): number | null {
  if (!fecha) return null;
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoy.getTime()) / 86400000);
}

function urgencia(dias: number | null): { color: string; bg: string; label: string; ring: string } {
  if (dias === null) return { color: "text-gray-400", bg: "bg-gray-50", label: "Sin fecha", ring: "border-gray-200" };
  if (dias < 0)  return { color: "text-red-700",    bg: "bg-red-50",    label: "VENCIDA",   ring: "border-red-400" };
  if (dias <= 15) return { color: "text-red-600",    bg: "bg-red-50",    label: `${dias}d`,  ring: "border-red-400" };
  if (dias <= 45) return { color: "text-orange-600", bg: "bg-orange-50", label: `${dias}d`,  ring: "border-orange-400" };
  if (dias <= 90) return { color: "text-yellow-700", bg: "bg-yellow-50", label: `${dias}d`,  ring: "border-yellow-400" };
  return { color: "text-green-700", bg: "bg-green-50", label: `${dias}d`, ring: "border-green-300" };
}

const EMPTY: Omit<DestinaciónIT, "id"> = {
  numero: "", descripcion: "", categoria: "", codigoProducto: "", proveedor: "", precioUnitarioUSD: 0, valorUSD: 0,
  fechaAltaARCA: "", fechaVtoOriginal: "", fechaVtoProrroga: "", fechaVencimiento: "",
  stockDocumental: 0, stockFisico: 0, enProduccion: 0, desperdicios: 0, ptSeville: 0, ptTomalar: 0,
  unidad: "UNID", estado: "", observaciones: "",
};

export default function DestinacionesPage() {
  const [items, setItems] = useState<DestinaciónIT[]>([]);
  const [polizas, setPolizas] = useState<Poliza[]>([]);
  const [modal, setModal] = useState<DestinaciónIT | "new" | null>(null);
  const [form, setForm] = useState<Omit<DestinaciónIT, "id">>(EMPTY);
  const [expandId, setExpandId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [filtro, setFiltro] = useState<"todos" | "criticas" | "proximas" | "ok">("todos");
  const [confirmarElim, setConfirmarElim] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const d = loadData();
    setItems(d.destinaciones ?? []);
    setPolizas(d.polizas ?? []);
  }, []);

  const persist = (next: DestinaciónIT[]) => {
    const d = loadData(); d.destinaciones = next; saveData(d); setItems(next);
  };

  const openNew = () => { setForm(EMPTY); setModal("new"); };
  const openEdit = (item: DestinaciónIT) => {
    setForm({ ...item });
    setModal(item);
  };

  const handleSave = () => {
    const data = { ...form };
    if (modal === "new") {
      persist([...items, { ...data, id: `dest-${Date.now()}` }]);
    } else if (modal) {
      persist(items.map(i => i.id === (modal as DestinaciónIT).id ? { ...data, id: (modal as DestinaciónIT).id } : i));
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); setModal(null); }, 800);
  };

  const handleDelete = (id: string) => {
    persist(items.filter(i => i.id !== id));
    setConfirmarElim(null);
  };

  // Filtrado y ordenado por urgencia
  const visible = items
    .map(i => ({ ...i, dias: diasRestantes(vencimientoEfectivo(i)) }))
    .filter(i => {
      if (filtro === "criticas") return i.dias !== null && i.dias <= 15;
      if (filtro === "proximas") return i.dias !== null && i.dias > 15 && i.dias <= 90;
      if (filtro === "ok")       return i.dias === null || i.dias > 90;
      return true;
    })
    .sort((a, b) => {
      if (a.dias === null && b.dias === null) return 0;
      if (a.dias === null) return 1;
      if (b.dias === null) return -1;
      return a.dias - b.dias;
    });

  // KPIs
  const vencidas  = items.filter(i => { const d = diasRestantes(vencimientoEfectivo(i)); return d !== null && d < 0; }).length;
  const criticas  = items.filter(i => { const d = diasRestantes(vencimientoEfectivo(i)); return d !== null && d >= 0 && d <= 15; }).length;
  const proximas  = items.filter(i => { const d = diasRestantes(vencimientoEfectivo(i)); return d !== null && d > 15 && d <= 90; }).length;
  const vigentes  = items.filter(i => { const d = diasRestantes(vencimientoEfectivo(i)); return d !== null && d > 90; }).length;

  const fu = (f: string) => form[f as keyof typeof form] as string ?? "";
  const sf = (f: string, v: string | number) => setForm(prev => ({ ...prev, [f]: v }));

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Destinaciones x Vencer</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-gray-500">{items.length} destinaciones IT · despachante: Carlos Arnobio Herrera</p>
            <Link href="/polizas"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-olive-600 hover:text-olive-900 bg-olive-50 hover:bg-olive-100 px-2.5 py-1 rounded-lg transition-colors border border-olive-200">
              <Shield size={12} /> Ver pólizas vinculadas <ExternalLink size={10} />
            </Link>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-olive-600 hover:bg-olive-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <FileSpreadsheet size={14} /> Exportar
          </button>
          <button onClick={openNew}
            className="flex items-center gap-2 px-3 py-2 bg-olive-600 hover:bg-olive-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus size={15} /> Nueva destinación
          </button>
        </div>
      </div>
      {exportOpen && (
        <ExportModal
          seccionesPreset={["destinaciones"]}
          onClose={() => setExportOpen(false)}
          onExport={async (opts: ExportOpts) => {
            const { exportToExcel } = await import("@/lib/abastecimiento/exportExcel");
            await exportToExcel(opts);
          }}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Vencidas",    count: vencidas,  color: "bg-red-100 text-red-700",     key: "criticas" as const, icon: "🔴" },
          { label: "≤ 15 días",   count: criticas,  color: "bg-red-50 text-red-600",      key: "criticas" as const, icon: "🚨" },
          { label: "≤ 90 días",   count: proximas,  color: "bg-yellow-50 text-yellow-700",key: "proximas" as const, icon: "⚠️" },
          { label: "Vigentes",    count: vigentes,  color: "bg-green-50 text-green-700",  key: "ok" as const,      icon: "✅" },
        ].map(k => (
          <button key={k.label} onClick={() => setFiltro(filtro === k.key && k.key !== "ok" ? "todos" : k.key)}
            className={`rounded-xl p-3 text-left border-2 transition-all ${k.color} ${filtro === k.key ? "border-current" : "border-transparent"}`}>
            <p className="text-xs font-medium">{k.icon} {k.label}</p>
            <p className="text-2xl font-bold mt-1">{k.count}</p>
          </button>
        ))}
      </div>

      {/* Filtro tabs */}
      <div className="flex gap-2 text-sm">
        {(["todos","criticas","proximas","ok"] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${filtro === f ? "bg-olive-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {f === "todos" ? "Todas" : f === "criticas" ? "Críticas (≤15d)" : f === "proximas" ? "Próximas (≤90d)" : "Vigentes"}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {visible.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay destinaciones en este filtro</p>
          </div>
        )}
        {visible.map(item => {
          const u = urgencia(item.dias);
          const expanded = expandId === item.id;
          const hasPror = !!item.fechaVtoProrroga && item.fechaVtoProrroga !== item.fechaVtoOriginal;
          return (
            <div key={item.id} className={`bg-white rounded-xl border-2 ${u.ring} overflow-hidden transition-all`}>
              {/* Fila principal */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Urgencia badge */}
                <div className={`shrink-0 w-16 text-center px-2 py-1.5 rounded-lg ${u.bg}`}>
                  <p className={`text-xs font-bold ${u.color}`}>{u.label}</p>
                  {item.dias !== null && item.dias < 0 && <p className="text-xs text-red-500">VENCIDA</p>}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-olive-600 bg-olive-50 px-2 py-0.5 rounded">
                      {item.numero}
                    </span>
                    {item.dias !== null && item.dias <= 15 && item.dias >= 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600 animate-pulse">
                        <AlertTriangle size={12} /> URGENTE
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5 truncate">{item.descripcion}</p>
                  {item.proveedor && <p className="text-xs text-gray-400 mt-0.5">{item.proveedor}</p>}
                </div>

                {/* Fechas clave */}
                <div className="hidden sm:grid grid-cols-3 gap-x-4 text-xs text-center shrink-0">
                  <div>
                    <p className="text-gray-400">Alta ARCA</p>
                    <p className="font-medium text-gray-700">{fmt(item.fechaAltaARCA)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Vto. original</p>
                    <p className="font-medium text-gray-700">{fmt(item.fechaVtoOriginal)}</p>
                  </div>
                  <div>
                    <p className={`font-semibold ${u.color}`}>Vto. actual</p>
                    <p className={`font-bold ${u.color}`}>{fmt(item.fechaVencimiento)}</p>
                  </div>
                </div>

                {/* Stock documental */}
                {item.stockDocumental > 0 && (
                  <div className="hidden md:block text-right shrink-0">
                    <p className="text-xs text-gray-400">Saldo MOA</p>
                    <p className="font-bold text-yellow-700 text-sm">{item.stockDocumental.toLocaleString()} {item.unidad}</p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandId(expanded ? null : item.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button onClick={() => openEdit(item)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-olive-100 hover:text-olive-600 transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => setConfirmarElim(item.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Detalle expandido */}
              {expanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400 font-medium uppercase tracking-wide">Alta ARCA</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{fmt(item.fechaAltaARCA)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium uppercase tracking-wide">Vto. Original</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{fmt(item.fechaVtoOriginal)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium uppercase tracking-wide">Vto. Prórroga</p>
                    <p className={`font-semibold mt-0.5 ${hasPror ? "text-olive-600" : "text-gray-400"}`}>
                      {hasPror ? fmt(item.fechaVtoProrroga) : "Sin prórroga"}
                    </p>
                  </div>
                  <div>
                    <p className={`font-medium uppercase tracking-wide ${u.color}`}>Vto. Actual</p>
                    <p className={`font-bold mt-0.5 ${u.color}`}>{fmt(item.fechaVencimiento)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium uppercase tracking-wide">Unidad</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{item.unidad}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium uppercase tracking-wide">Saldo MOA</p>
                    <p className="font-semibold text-yellow-700 mt-0.5">{item.stockDocumental > 0 ? item.stockDocumental.toLocaleString() : "—"} {item.stockDocumental > 0 ? item.unidad : ""}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium uppercase tracking-wide">Póliza de Caución</p>
                    {(() => {
                      const pol = getPolizaDeDestinacion(item.numero, polizas);
                      return pol ? (
                        <Link href="/polizas"
                          className="inline-flex items-center gap-1 mt-0.5 font-semibold text-olive-600 hover:underline text-xs">
                          <Shield size={11} /> {pol.numero} <ExternalLink size={10} />
                        </Link>
                      ) : (
                        <p className="font-semibold text-gray-400 mt-0.5">Sin póliza vinculada</p>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium uppercase tracking-wide">Precio unitario</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{item.precioUnitarioUSD > 0 ? `USD ${item.precioUnitarioUSD.toLocaleString("es-AR", { maximumFractionDigits: 4 })}` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium uppercase tracking-wide">Valor total imp.</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{item.valorUSD > 0 ? `USD ${item.valorUSD.toLocaleString()}` : "—"}</p>
                  </div>
                  {item.observaciones && (
                    <div className="col-span-2 sm:col-span-4 bg-white rounded-lg px-3 py-2">
                      <p className="text-gray-400 font-medium uppercase tracking-wide">Observaciones</p>
                      <p className="text-gray-700 mt-0.5">{item.observaciones}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal nueva/editar destinación */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-6 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-bold text-gray-900">
                {modal === "new" ? "Nueva destinación IT" : `Editar — ${(modal as DestinaciónIT).numero}`}
              </h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Número + descripción */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="N° Destinación (ARCA)">
                  <Input value={fu("numero")} onChange={e => sf("numero", e.target.value)}
                    placeholder="ej: 26001IT14000278H" />
                </FormField>
                <FormField label="Unidad">
                  <select value={fu("unidad")} onChange={e => sf("unidad", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400">
                    {["UNID","KG","LTS","TN","BULTOS"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="Descripción / Mercadería">
                <Input value={fu("descripcion")} onChange={e => sf("descripcion", e.target.value)}
                  placeholder="ej: ÁCIDO ACÉTICO 80%" />
              </FormField>
              <FormField label="Proveedor / Exportador">
                <Input value={fu("proveedor")} onChange={e => sf("proveedor", e.target.value)}
                  placeholder="ej: INDUSTRIAS XYZ S.A." />
              </FormField>

              {/* Precios */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">💲 Precios de importación</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Precio unitario (USD)">
                    <Input type="number" value={form.precioUnitarioUSD || ""} min={0} step="0.01"
                      onChange={e => sf("precioUnitarioUSD", +e.target.value)} placeholder="0.00" />
                  </FormField>
                  <FormField label="Valor total importación (USD)">
                    <Input type="number" value={form.valorUSD || ""} min={0} step="0.01"
                      onChange={e => sf("valorUSD", +e.target.value)} placeholder="0.00" />
                  </FormField>
                </div>
                {form.precioUnitarioUSD > 0 && form.stockDocumental > 0 && (
                  <p className="text-xs text-gray-500">
                    Valor estimado por saldo documental: <strong className="text-olive-700">USD {(form.precioUnitarioUSD * form.stockDocumental).toLocaleString("es-AR", { maximumFractionDigits: 2 })}</strong>
                  </p>
                )}
              </div>

              {/* Fechas — bloque con separación visual */}
              <div className="bg-olive-50 border border-olive-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-olive-600 uppercase tracking-wide">📅 Fechas ARCA</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Fecha Alta ARCA (ingreso)">
                    <Input type="date" value={fu("fechaAltaARCA")} onChange={e => sf("fechaAltaARCA", e.target.value)} />
                  </FormField>
                  <FormField label="Vto. Original">
                    <Input type="date" value={fu("fechaVtoOriginal")} onChange={e => sf("fechaVtoOriginal", e.target.value)} />
                  </FormField>
                  <FormField label="Vto. Prórroga (si aplica)">
                    <Input type="date" value={fu("fechaVtoProrroga")} onChange={e => sf("fechaVtoProrroga", e.target.value)} />
                  </FormField>
                  <FormField label="Vto. Actual VIGENTE">
                    <Input type="date" value={fu("fechaVencimiento")} onChange={e => sf("fechaVencimiento", e.target.value)} />
                  </FormField>
                </div>
                {/* Preview días restantes */}
                {fu("fechaVencimiento") && (() => {
                  const d = diasRestantes(fu("fechaVencimiento"));
                  const u = urgencia(d);
                  return (
                    <div className={`rounded-lg px-3 py-2 ${u.bg} flex items-center justify-between`}>
                      <span className={`text-sm font-medium ${u.color}`}>Días hasta vencimiento</span>
                      <span className={`text-xl font-bold ${u.color}`}>{d !== null ? (d < 0 ? `VENCIDA hace ${Math.abs(d)} días` : `${d} días`) : "—"}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Saldos */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Saldo MOA (documental)">
                  <Input type="number" value={form.stockDocumental || ""} min={0}
                    onChange={e => sf("stockDocumental", +e.target.value)} />
                </FormField>
              </div>

              {/* Estado operativo */}
              <FormField label="Estado operativo">
                <select value={fu("estado")} onChange={e => sf("estado", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400">
                  {(["", "Prórroga otorgada", "Prórroga solicitada", "Solicitar Baja", "Próxima a vencer", "Con solicitud de baja", "Sin info"] as const).map(v =>
                    <option key={v} value={v}>{v || "— Sin estado —"}</option>
                  )}
                </select>
              </FormField>

              <FormField label="Observaciones">
                <textarea value={fu("observaciones")} rows={2}
                  onChange={e => sf("observaciones", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400 resize-none" />
              </FormField>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-olive-50/40 rounded-b-2xl sticky bottom-0">
              <button onClick={() => setModal(null)}
                className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-100">
                Cancelar
              </button>
              <button onClick={handleSave}
                className={`px-6 py-2 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${saved ? "bg-green-500" : "bg-olive-600 hover:bg-olive-700"}`}>
                {saved ? <><CheckCircle2 size={16} /> Guardado</> : (modal === "new" ? "Agregar" : "Guardar cambios")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminación */}
      {confirmarElim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-gray-900 mb-2">Eliminar destinación</h3>
            <p className="text-sm text-gray-600 mb-5">¿Confirmar eliminación? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmarElim(null)} className="px-4 py-2 border border-gray-300 rounded-xl text-sm">Cancelar</button>
              <button onClick={() => handleDelete(confirmarElim)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
