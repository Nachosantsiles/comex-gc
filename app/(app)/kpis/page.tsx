"use client";
import { useEffect, useState } from "react";
import { loadData, saveData, InformeData, vencimientoEfectivo } from "@/lib/abastecimiento-store";
import FormField, { Input } from "@/components/abastecimiento/FormField";

function dias(fecha: string) {
  return Math.round((new Date(fecha).getTime() - Date.now()) / 86400000);
}

export default function KPIsPage() {
  const [data, setData] = useState<InformeData | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setData(loadData()); }, []);

  const handleSave = () => {
    if (!data) return;
    saveData(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!data) return null;

  const oc = data.ordenesCompra;
  const it = data.destinaciones;
  const pol = data.polizas;
  const acc = data.acciones;

  const cumplimiento = oc.length > 0 ? Math.round((oc.filter(o => o.estado === "Recibida").length / oc.length) * 100) : 0;
  const criticas = it.filter(d => { const v = vencimientoEfectivo(d); return v && dias(v) < 90; }).length;
  const polVigentes = pol.filter(p => p.estado === "Activa").length;
  const accCompletadas = acc.filter(a => a.estado === "Completada").length;
  const accPendientes = acc.filter(a => a.estado !== "Completada").length;

  const KPICard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) => (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-semibold mt-0.5">{label}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">KPIs de Gestión</h2>
          <p className="text-sm text-gray-500 mt-0.5">Indicadores del período</p>
        </div>
      </div>

      {/* Config período */}
      <div className="bg-olive-50/60 border border-olive-100 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm">Configuración del informe</h3>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Empresa">
            <Input value={data.empresa} onChange={e => setData({ ...data, empresa: e.target.value })} placeholder="Nombre de la empresa" />
          </FormField>
          <FormField label="Período (YYYY-MM)">
            <Input value={data.periodo} onChange={e => setData({ ...data, periodo: e.target.value })} placeholder="2025-06" />
          </FormField>
          <FormField label="Responsable">
            <Input value={data.responsable} onChange={e => setData({ ...data, responsable: e.target.value })} placeholder="Nombre del responsable" />
          </FormField>
        </div>
        <button onClick={handleSave} className="px-4 py-2 bg-olive-600 hover:bg-olive-700 text-white text-sm font-semibold rounded-lg transition-colors">
          {saved ? "✓ Guardado" : "Guardar configuración"}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard label="Cumplimiento OC" value={`${cumplimiento}%`} sub={`${oc.filter(o => o.estado === "Recibida").length}/${oc.length} recibidas`} color="bg-olive-50 text-olive-700" />
        <KPICard label="Total OC emitidas" value={oc.length} sub={`${oc.filter(o => o.estado === "Pendiente").length} pendientes`} color="bg-olive-50 text-olive-700" />
        <KPICard label="Destinaciones IT" value={it.length} sub={`${criticas} críticas`} color={criticas > 0 ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"} />
        <KPICard label="Pólizas vigentes" value={polVigentes} sub={`${pol.filter(p => p.estado === "Dada de baja").length} dadas de baja`} color={pol.filter(p => p.estado === "Baja solicitada").length > 0 ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"} />
        <KPICard label="Acciones completadas" value={accCompletadas} sub={`${accPendientes} pendientes`} color="bg-purple-50 text-purple-800" />
        <KPICard label="Avance plan" value={acc.length > 0 ? `${Math.round(acc.reduce((s, a) => s + a.avance, 0) / acc.length)}%` : "—"} sub="promedio avance acciones" color="bg-yellow-50 text-yellow-800" />
      </div>
    </div>
  );
}
