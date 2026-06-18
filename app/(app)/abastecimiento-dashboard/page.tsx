"use client";
import { useEffect, useState } from "react";
import { loadData, InformeData, vencimientoEfectivo } from "@/lib/abastecimiento-store";
import Link from "next/link";
import {
  ShoppingCart, Ship, Shield, ClipboardList, AlertTriangle,
  FlaskConical, Globe, Building2, BarChart3, Clock, FileText,
  ChevronRight, DollarSign, CheckCircle2, FileSpreadsheet,
  Boxes, Activity, ArrowRight, TrendingUp, Wheat,
} from "lucide-react";
import ExportModal, { type ExportOpts } from "@/components/abastecimiento/ExportModal";
import { PageHeader, PrimaryBtn } from "@/components/abastecimiento/PageHeader";

const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
function dias(f: string) {
  if (!f) return null;
  const d = new Date(f); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoy.getTime()) / 86400000);
}
function fmt(f: string) {
  if (!f) return "—";
  const [y, m, d] = f.split("-");
  return !y || !m || !d ? f : `${d}/${m}/${y}`;
}

/* ─── Stat card ──────────────────────────────────────── */
function StatCard({ href, icon: Icon, iconColor, iconBg, value, label, sub, alert }: {
  href: string; icon: React.ElementType; iconColor: string; iconBg: string;
  value: number | string; label: string; sub: string; alert?: number;
}) {
  return (
    <Link href={href}
      className="group bg-white rounded-2xl border border-stone-200 p-5 flex flex-col gap-4 hover:shadow-md hover:border-stone-300 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={19} className={iconColor} />
        </div>
        {alert != null && alert > 0 && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
            {alert} alerta{alert !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div>
        <p className="text-[32px] font-black text-stone-900 leading-none tracking-tight">{value}</p>
        <p className="text-sm font-semibold text-stone-700 mt-1.5">{label}</p>
        <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
      </div>
      <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity">
        Ver detalle <ArrowRight size={11} />
      </div>
    </Link>
  );
}

/* ─── Quick link ──────────────────────────────────────── */
function QuickLink({ href, icon: Icon, label, badge }: {
  href: string; icon: React.ElementType; label: string; badge?: number;
}) {
  return (
    <Link href={href}
      className="relative flex flex-col items-center gap-2 p-3.5 rounded-xl bg-stone-50 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all group">
      <Icon size={18} className="text-stone-400 group-hover:text-amber-700 transition-colors" />
      <span className="text-[11px] font-semibold text-stone-500 group-hover:text-amber-800">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-1">
          {badge}
        </span>
      )}
    </Link>
  );
}

/* ══════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [data, setData] = useState<InformeData | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => { setData(loadData()); }, []);
  if (!data) return null;

  // Cálculos
  const destCriticas = data.destinaciones.filter(d => { const x = dias(vencimientoEfectivo(d)); return x !== null && x >= 0 && x <= 15; });
  const destProximas = data.destinaciones.filter(d => { const x = dias(vencimientoEfectivo(d)); return x !== null && x > 15 && x <= 90; });
  const destVencidas = data.destinaciones.filter(d => { const x = dias(vencimientoEfectivo(d)); return x !== null && x < 0; });
  const destConSaldo = data.destinaciones.filter(d => d.stockDocumental > 0);

  const polActivas   = data.polizas.filter(p => p.estado === "Activa");
  const polBajaSolic = data.polizas.filter(p => p.estado === "Baja solicitada");
  const primaTotal   = polActivas.reduce((s, p) => s + (p.primaARS ?? 0), 0);
  const polAhorrar   = polActivas.filter(p =>
    p.destinacionesVinculadas.length > 0 &&
    p.destinacionesVinculadas.every(num => {
      const d = data.destinaciones.find(x => x.numero === num);
      return d ? d.stockDocumental === 0 : true;
    })
  );

  const GRUPOS_QUI    = new Set(["Ácidos", "Gomas / Espesantes", "Álcalis", "Sales", "Sulfatos / Minerales", "Aditivos / Conservantes"]);
  const insumosIT     = data.insumosStock.filter(i => i.tipo === "IT");
  const insumosDiff   = insumosIT.filter(i => {
    if (i.saldoMOA <= 0) return false;
    const f = (i as any).factorConvMOA ?? 1;
    return i.stockFisico !== Math.round(i.saldoMOA * f * 100) / 100;
  });
  const insumosQuimicos = data.insumosStock.filter(i => GRUPOS_QUI.has(i.grupo));
  const insumosAux      = data.insumosStock.filter(i => !GRUPOS_QUI.has(i.grupo));

  const ocPendientes  = data.ordenesCompra.filter(o => o.estado === "Pendiente" || o.estado === "Parcial");
  const hayUrgencias  = destCriticas.length > 0 || destVencidas.length > 0;
  const accionesPend  = data.acciones.filter(a => a.estado !== "Completada");
  const accionesAlta  = accionesPend.filter(a => a.prioridad === "Alta");

  const proximosVenc = data.destinaciones
    .map(d => ({ ...d, dr: dias(vencimientoEfectivo(d)) }))
    .filter(d => d.dr !== null && d.dr >= 0 && d.dr <= 90)
    .sort((a, b) => (a.dr ?? 99) - (b.dr ?? 99))
    .slice(0, 6);

  return (
    <div className="space-y-8 max-w-7xl">

      {/* ── Header ── */}
      <PageHeader
        title="Resumen ejecutivo"
        subtitle={`${data.empresa || "Grupo Cazorla"} · Período ${data.periodo || "—"}`}
        badge={hayUrgencias ? { label: `${destCriticas.length + destVencidas.length} urgencias`, variant: "alert" } : undefined}
        actions={
          <PrimaryBtn onClick={() => setExportOpen(true)} icon={FileSpreadsheet}>
            Exportar informe
          </PrimaryBtn>
        }
      />
      {exportOpen && (
        <ExportModal onClose={() => setExportOpen(false)}
          onExport={async (opts: ExportOpts) => {
            const { exportToExcel } = await import("@/lib/abastecimiento/exportExcel");
            await exportToExcel(opts);
          }}
        />
      )}

      {/* ── Banner estado ── */}
      {hayUrgencias ? (
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-red-50 border border-red-200">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800">
              {destVencidas.length > 0 && `${destVencidas.length} destinación${destVencidas.length > 1 ? "es" : ""} vencida${destVencidas.length > 1 ? "s" : ""}`}
              {destVencidas.length > 0 && destCriticas.length > 0 && " · "}
              {destCriticas.length > 0 && `${destCriticas.length} vencen en menos de 15 días`}
            </p>
            <p className="text-xs text-red-600 mt-0.5">Requieren gestión inmediata</p>
          </div>
          <Link href="/destinaciones"
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0">
            Gestionar <ArrowRight size={12} />
          </Link>
        </div>
      ) : data.destinaciones.length > 0 ? (
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">Todo en orden — sin alertas críticas</p>
        </div>
      ) : null}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          href="/destinaciones"
          icon={Ship}
          iconBg={hayUrgencias ? "bg-red-100" : "bg-amber-100"}
          iconColor={hayUrgencias ? "text-red-600" : "text-amber-700"}
          value={data.destinaciones.length}
          label="Destinaciones IT"
          sub={`${destConSaldo.length} con saldo · ${destProximas.length} próximas`}
          alert={destCriticas.length + destVencidas.length}
        />
        <StatCard
          href="/polizas"
          icon={Shield}
          iconBg={polAhorrar.length > 0 ? "bg-orange-100" : "bg-amber-100"}
          iconColor={polAhorrar.length > 0 ? "text-orange-600" : "text-amber-700"}
          value={polActivas.length}
          label="Pólizas activas"
          sub={`${polBajaSolic.length} baja solicitada · prima $${primaTotal > 0 ? (primaTotal / 1000).toFixed(0) + "k" : "—"}/mes`}
          alert={polAhorrar.length}
        />
        <StatCard
          href="/insumos"
          icon={FlaskConical}
          iconBg={insumosDiff.length > 0 ? "bg-yellow-100" : "bg-amber-100"}
          iconColor={insumosDiff.length > 0 ? "text-yellow-700" : "text-amber-700"}
          value={data.insumosStock.length}
          label="Insumos controlados"
          sub={`${insumosQuimicos.length} químicos · ${insumosAux.length} auxiliar`}
          alert={insumosDiff.length}
        />
        <StatCard
          href="/compras"
          icon={ShoppingCart}
          iconBg="bg-amber-100"
          iconColor="text-amber-700"
          value={data.ordenesCompra.length}
          label="Órdenes de compra"
          sub={`${ocPendientes.length} pendientes`}
        />
      </div>

      {/* ── Fila secundaria ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/proveedores",         icon: Building2,    label: "Proveedores activos",  val: data.proveedores.filter(p => p.activo).length },
          { href: "/importaciones-comunes",icon: Globe,        label: "Importaciones",        val: data.importacionesComunes.length },
          { href: "/stock",               icon: Boxes,        label: "Stock IT (lotes)",     val: insumosIT.length },
          { href: "/plan",                icon: ClipboardList, label: "Acciones pendientes",  val: accionesPend.length, urgent: accionesAlta.length > 0 },
        ].map(s => (
          <Link key={s.href} href={s.href}
            className={`flex items-center gap-3 p-4 rounded-xl border bg-white hover:shadow-sm transition-all ${s.urgent ? "border-red-200 bg-red-50/40" : "border-stone-200 hover:border-stone-300"}`}>
            <s.icon size={18} className={`shrink-0 ${s.urgent ? "text-red-500" : "text-stone-400"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-400 truncate">{s.label}</p>
              <p className={`text-xl font-black leading-tight ${s.urgent ? "text-red-700" : "text-stone-800"}`}>{s.val}</p>
            </div>
            <ChevronRight size={14} className="text-stone-300 shrink-0" />
          </Link>
        ))}
      </div>

      {/* ── Zona inferior ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Vencimientos */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <Clock size={16} className="text-amber-700" />
              <p className="font-semibold text-stone-800 text-sm">Próximos vencimientos</p>
              <span className="text-xs text-stone-400 font-medium">— 90 días</span>
            </div>
            <Link href="/destinaciones" className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1">
              Ver todas <ChevronRight size={12} />
            </Link>
          </div>
          {proximosVenc.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle2 size={28} className="text-stone-200 mx-auto mb-2" />
              <p className="text-sm text-stone-400">Sin vencimientos en los próximos 90 días</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-50">
              {proximosVenc.map(d => {
                const urg = d.dr! <= 15 ? "bg-red-100 text-red-700 border-red-200"
                  : d.dr! <= 45 ? "bg-orange-100 text-orange-700 border-orange-200"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200";
                return (
                  <Link key={d.id} href="/destinaciones"
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-stone-50 transition-colors">
                    <span className={`shrink-0 text-center rounded-xl border px-2 py-1.5 min-w-[48px] ${urg}`}>
                      <span className="block text-lg font-black leading-none">{d.dr}</span>
                      <span className="block text-[9px] font-bold uppercase tracking-wide leading-none mt-0.5">días</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">{d.descripcion}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{d.numero} · {fmt(vencimientoEfectivo(d))}</p>
                    </div>
                    {d.stockDocumental > 0 && (
                      <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        {d.stockDocumental.toLocaleString()} {d.unidad}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">

          {/* Costo pólizas */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-stone-100">
              <DollarSign size={16} className="text-amber-700" />
              <p className="font-semibold text-stone-800 text-sm">Costo pólizas</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-500">Prima mensual activa</span>
                <span className="text-sm font-bold text-stone-900">
                  {primaTotal > 0 ? `$${primaTotal.toLocaleString("es-AR")}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-500">Ahorro potencial</span>
                <span className={`text-sm font-bold ${polAhorrar.length > 0 ? "text-emerald-600" : "text-stone-300"}`}>
                  {polAhorrar.length > 0
                    ? `$${polAhorrar.reduce((s, p) => s + (p.primaARS || 0), 0).toLocaleString("es-AR")}`
                    : "—"}
                </span>
              </div>
              <div className="h-px bg-stone-100" />
              <Link href="/polizas" className="flex items-center justify-between text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors">
                Gestionar pólizas <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Acceso rápido */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-stone-100">
              <Activity size={16} className="text-amber-700" />
              <p className="font-semibold text-stone-800 text-sm">Acceso rápido</p>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              <QuickLink href="/destinaciones" icon={Clock}        label="Destinaciones" badge={destCriticas.length + destVencidas.length} />
              <QuickLink href="/polizas"       icon={Shield}       label="Pólizas"       badge={polAhorrar.length} />
              <QuickLink href="/insumos"       icon={FlaskConical} label="Insumos"       badge={insumosDiff.length} />
              <QuickLink href="/plan"          icon={ClipboardList}label="Plan"          badge={accionesAlta.length} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Reportes ── */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-stone-100">
          <FileText size={16} className="text-amber-700" />
          <p className="font-semibold text-stone-800 text-sm">Reportes disponibles</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Ship,          bg: "bg-amber-100",   color: "text-amber-700",  titulo: "Destinaciones IT",         desc: "Vencimientos, saldos MOA y prórrogas",           href: "/destinaciones" },
            { icon: Shield,        bg: "bg-amber-100",   color: "text-amber-700",  titulo: "Pólizas de Caución",       desc: "Primas activas, bajas y ahorro potencial",       href: "/polizas" },
            { icon: FlaskConical,  bg: "bg-yellow-100",  color: "text-yellow-700", titulo: "Stock vs MOA",             desc: "Insumos IT con discrepancia física/documental",  href: "/insumos" },
            { icon: Building2,     bg: "bg-stone-100",   color: "text-stone-600",  titulo: "Homologación Proveedores", desc: "Vencimientos próximos y pendientes",             href: "/proveedores" },
            { icon: BarChart3,     bg: "bg-amber-100",   color: "text-amber-700",  titulo: "KPIs del Período",         desc: "Cumplimiento OC, lead times y acciones",        href: "/kpis" },
            { icon: ClipboardList, bg: "bg-amber-100",   color: "text-amber-700",  titulo: "Plan de Acción",           desc: "Compromisos por prioridad y responsable",       href: "/plan" },
          ].map((r, i) => (
            <Link key={r.titulo} href={r.href}
              className={`flex gap-4 p-5 hover:bg-stone-50 transition-colors group ${i < 3 ? "border-b border-stone-100" : ""} ${i % 3 !== 2 ? "border-r border-stone-100" : ""}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${r.bg}`}>
                <r.icon size={16} className={r.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800 group-hover:text-amber-800 transition-colors">{r.titulo}</p>
                <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{r.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
