"use client";
import { useState } from "react";
import { X, Download, CheckSquare, Square, FileSpreadsheet } from "lucide-react";

export interface ExportOpts {
  desde: string;
  hasta: string;
  secciones: Set<string>;
}

export const SECCIONES_DISPONIBLES = [
  { key: "dashboard",         label: "Dashboard / Resumen ejecutivo" },
  { key: "destinaciones",     label: "Destinaciones x Vencer" },
  { key: "polizas",           label: "Pólizas de Caución" },
  { key: "insumos",           label: "Control de Insumos (Químicos + Auxiliar)" },
  { key: "compras",           label: "Compras Nacionales" },
  { key: "importaciones",     label: "Importaciones Comunes" },
  { key: "proveedores",       label: "Proveedores" },
  { key: "kpis",              label: "KPIs del Período" },
  { key: "plan",              label: "Plan de Acción" },
];

interface Props {
  /** Qué secciones vienen pre-seleccionadas al abrir */
  seccionesPreset?: string[];
  onClose: () => void;
  onExport: (opts: ExportOpts) => Promise<void>;
}

export default function ExportModal({ seccionesPreset, onClose, onExport }: Props) {
  const hoy = new Date().toISOString().slice(0, 10);
  const primerDiaMes = hoy.slice(0, 8) + "01";

  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoy);
  const [secciones, setSecciones] = useState<Set<string>>(
    new Set(seccionesPreset ?? SECCIONES_DISPONIBLES.map(s => s.key))
  );
  const [loading, setLoading] = useState(false);

  const toggle = (key: string) => {
    const s = new Set(secciones);
    s.has(key) ? s.delete(key) : s.add(key);
    setSecciones(s);
  };
  const toggleAll = () => {
    if (secciones.size === SECCIONES_DISPONIBLES.length) setSecciones(new Set());
    else setSecciones(new Set(SECCIONES_DISPONIBLES.map(s => s.key)));
  };

  const handleExport = async () => {
    if (secciones.size === 0) return;
    setLoading(true);
    await onExport({ desde, hasta, secciones });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet size={20} className="text-green-600" />
            <h3 className="font-bold text-gray-900">Exportar a Excel</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Rango de fechas */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Período del reporte</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Desde</label>
                <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Hasta</label>
                <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            </div>
            {desde && hasta && (
              <p className="text-xs text-gray-400 mt-1.5">
                Período: {desde.split("-").reverse().join("/")} al {hasta.split("-").reverse().join("/")}
              </p>
            )}
          </div>

          {/* Selector de secciones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Hojas a incluir</p>
              <button onClick={toggleAll} className="text-xs text-olive-500 hover:underline font-medium">
                {secciones.size === SECCIONES_DISPONIBLES.length ? "Desmarcar todas" : "Marcar todas"}
              </button>
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {SECCIONES_DISPONIBLES.map(s => (
                <label key={s.key}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${secciones.has(s.key) ? "bg-green-50" : "hover:bg-gray-50"}`}>
                  <span className={secciones.has(s.key) ? "text-green-600" : "text-gray-300"}>
                    {secciones.has(s.key) ? <CheckSquare size={16} /> : <Square size={16} />}
                  </span>
                  <input type="checkbox" checked={secciones.has(s.key)} onChange={() => toggle(s.key)} className="hidden" />
                  <span className={`text-sm font-medium ${secciones.has(s.key) ? "text-gray-800" : "text-gray-400"}`}>
                    {s.label}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">{secciones.size} de {SECCIONES_DISPONIBLES.length} secciones seleccionadas</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-olive-50/40 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-100">
            Cancelar
          </button>
          <button onClick={handleExport} disabled={loading || secciones.size === 0 || !desde || !hasta}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
            {loading
              ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Generando...</>
              : <><Download size={15} /> Descargar Excel</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
