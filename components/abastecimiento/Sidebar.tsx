"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Ship, Globe,
  FlaskConical, Clock, Shield, BarChart3, ClipboardList,
  Building2, AlertTriangle, FileSpreadsheet, ChevronRight,
  TrendingUp, Boxes,
} from "lucide-react";
import { loadData, DestinaciónIT, Poliza } from "@/lib/abastecimiento-store";
import ExportModal, { type ExportOpts } from "./ExportModal";

// ── helpers ──────────────────────────────────────────────────────
function diasRest(fecha: string): number | null {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(fecha); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoy.getTime()) / 86400000);
}

// ── alertas ───────────────────────────────────────────────────────
interface Alerta {
  id: string;
  nivel: "critica" | "urgente";
  seccion: "destinaciones" | "polizas";
  href: string;
}

function calcAlertas(destinaciones: DestinaciónIT[], polizas: Poliza[]): Alerta[] {
  const alertas: Alerta[] = [];

  destinaciones.forEach(d => {
    const dias = diasRest(d.fechaVencimiento);
    if (dias === null) return;
    if (dias < 0)   alertas.push({ id: `dest-venc-${d.id}`, nivel: "critica",  seccion: "destinaciones", href: "/destinaciones" });
    else if (dias <= 15) alertas.push({ id: `dest-crit-${d.id}`, nivel: "critica",  seccion: "destinaciones", href: "/destinaciones" });
    else if (dias <= 60 && d.stockDocumental > 0) {
      const tienePror = d.fechaVtoProrroga && d.fechaVtoProrroga !== d.fechaVtoOriginal;
      if (!tienePror) alertas.push({ id: `dest-pror-${d.id}`, nivel: "urgente", seccion: "destinaciones", href: "/destinaciones" });
    }
  });

  polizas.forEach(p => {
    if (p.estado === "Dada de baja" || p.estado === "Baja solicitada") return;
    const dests = destinaciones.filter(d => p.destinacionesVinculadas.includes(d.numero));
    if (dests.length === 0) return;
    if (dests.every(d => d.stockDocumental === 0) && p.estado === "Activa")
      alertas.push({ id: `pol-baja-${p.id}`, nivel: "critica", seccion: "polizas", href: "/polizas" });
    dests.forEach(d => {
      if (d.stockDocumental <= 0) return;
      const tienePror = d.fechaVtoProrroga && d.fechaVtoProrroga !== d.fechaVtoOriginal;
      const dias = diasRest(tienePror ? d.fechaVtoProrroga : d.fechaVencimiento);
      if (dias === null) return;
      if (dias >= 0 && dias <= 60 && !tienePror)
        alertas.push({ id: `pol-pror-${p.id}-${d.id}`, nivel: "urgente", seccion: "polizas", href: "/polizas" });
      if (tienePror && dias >= 0 && dias <= 60)
        alertas.push({ id: `pol-dec-${p.id}-${d.id}`, nivel: "critica", seccion: "polizas", href: "/polizas" });
    });
  });

  const seen = new Set<string>();
  return alertas.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
}

// ── nav agrupado ──────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/",  label: "Dashboard",  icon: LayoutDashboard, desc: "Resumen ejecutivo" },
    ],
  },
  {
    label: "GESTIÓN COMERCIAL",
    items: [
      { href: "/proveedores",            label: "Proveedores",        icon: Building2,     desc: "Maestro de proveedores" },
      { href: "/compras",                label: "Compras Nacionales",  icon: ShoppingCart,  desc: "Órdenes de compra" },
      { href: "/importaciones-comunes",  label: "Importaciones",       icon: Globe,         desc: "Despachos comunes" },
    ],
  },
  {
    label: "IMPORTACIONES IT",
    items: [
      { href: "/importaciones", label: "Importaciones IT",    icon: Ship,         desc: "Temporales en curso" },
      { href: "/insumos",       label: "Control de Insumos",  icon: FlaskConical, desc: "Químicos y auxiliares" },
      { href: "/stock",         label: "Stock IT (aduanero)", icon: Boxes,        desc: "Saldos aduaneros" },
      { href: "/destinaciones", label: "Destinaciones",       icon: Clock,        desc: "Vencimientos" },
      { href: "/polizas",       label: "Pólizas de Caución",  icon: Shield,       desc: "Garantías activas" },
    ],
  },
  {
    label: "SEGUIMIENTO",
    items: [
      { href: "/kpis", label: "KPIs",            icon: BarChart3,    desc: "Indicadores clave" },
      { href: "/plan", label: "Plan de Acción",  icon: ClipboardList,desc: "Compromisos abiertos" },
    ],
  },
];

const SECC_HREF: Record<string, string> = { destinaciones: "/destinaciones", polizas: "/polizas" };

// ─────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const path = usePathname();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const d = loadData();
    setAlertas(calcAlertas(d.destinaciones ?? [], d.polizas ?? []));
  }, [path]);

  const criticas   = alertas.filter(a => a.nivel === "critica");
  const urgentes   = alertas.filter(a => a.nivel === "urgente");
  const totalAlert = criticas.length + urgentes.length;

  const badgeDest = alertas.filter(a => a.seccion === "destinaciones").length;
  const badgePol  = alertas.filter(a => a.seccion === "polizas").length;
  const badgeMap: Record<string, number> = {
    "/destinaciones": badgeDest,
    "/polizas": badgePol,
  };

  const hoy    = new Date();
  const periodo = hoy.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <aside className="w-64 flex flex-col shrink-0 overflow-y-auto bg-gray-100 border-r border-gray-200">

      {/* ── Logo / Branding ── */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          {/* Logo con iniciales SC */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #596b2c 0%, #455425 60%, #596b2c 100%)" }}>
            <span className="text-white text-xs font-black tracking-tight">SC</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest leading-none text-olive-600">Seville Cazorla</p>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Informe Mensual</h1>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 capitalize pl-12">{periodo}</p>
      </div>

      {/* ── Panel de alertas ── */}
      {totalAlert > 0 && (
        <div className="mx-3 mt-3 rounded-xl overflow-hidden border border-red-200 bg-red-50 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-red-200 bg-red-100/60">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
            </span>
            <span className="text-xs font-bold text-red-800">
              {criticas.length > 0 ? `${criticas.length} crítica${criticas.length > 1 ? "s" : ""}` : ""}
              {criticas.length > 0 && urgentes.length > 0 ? " · " : ""}
              {urgentes.length > 0 ? `${urgentes.length} urgente${urgentes.length > 1 ? "s" : ""}` : ""}
            </span>
          </div>
          <div className="divide-y divide-red-100">
            {(["destinaciones", "polizas"] as const).map(sec => {
              const n = alertas.filter(a => a.seccion === sec).length;
              if (n === 0) return null;
              const esCrit = criticas.some(a => a.seccion === sec);
              return (
                <Link key={sec} href={SECC_HREF[sec]}
                  className="flex items-center justify-between px-3 py-1.5 hover:bg-red-100 transition-colors group">
                  <span className="text-xs text-red-700 font-medium capitalize">
                    {sec === "destinaciones" ? "Destinaciones" : "Pólizas"}
                  </span>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${esCrit ? "bg-red-600 text-white" : "bg-orange-400 text-white"}`}>
                    {n}<ChevronRight size={9} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Navegación ── */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, desc }) => {
                const active = path === href;
                const badge  = badgeMap[href] ?? 0;
                return (
                  <Link key={href} href={href}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all group ${
                      active ? "text-white shadow-sm" : "hover:bg-gray-200 text-gray-600"
                    }`}
                    style={active ? {
                      background: "linear-gradient(135deg, #596b2c 0%, #455425 70%, #596b2c 130%)",
                      boxShadow: "0 2px 8px rgba(89,107,44,0.20)",
                    } : {}}
                  >
                    <Icon size={16} className={active ? "text-olive-100 shrink-0" : "text-gray-400 shrink-0 group-hover:text-olive-600 transition-colors"} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold leading-tight ${active ? "text-white" : "text-gray-700"}`}>{label}</p>
                      <p className={`text-[10px] leading-none mt-0.5 truncate ${active ? "text-olive-200" : "text-gray-400"}`}>{desc}</p>
                    </div>
                    {badge > 0 && (
                      <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold leading-none shrink-0 ${active ? "bg-white text-olive-600" : "bg-red-500 text-white"}`}>
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 pb-4 pt-2 border-t border-gray-200 space-y-2 shrink-0">
        <button onClick={() => setExportOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-white text-xs font-bold rounded-xl transition-all active:scale-[.98]"
          style={{ background: "linear-gradient(135deg, #596b2c 0%, #455425 100%)", boxShadow: "0 2px 6px rgba(89,107,44,0.35)" }}>
          <FileSpreadsheet size={14} />
          Exportar Informe Excel
        </button>
        <p className="text-center text-[9px] text-gray-400 uppercase tracking-wider">
          Sistema · Gerencia Abastecimiento
        </p>
      </div>

      {exportOpen && (
        <ExportModal
          onClose={() => setExportOpen(false)}
          onExport={async (opts: ExportOpts) => {
            const { exportToExcel } = await import("@/lib/abastecimiento/exportExcel");
            await exportToExcel(opts);
          }}
        />
      )}
    </aside>
  );
}
