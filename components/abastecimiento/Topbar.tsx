"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, Ship, Globe, Package,
  FlaskConical, Clock, Shield, BarChart3, ClipboardList,
  Building2, ChevronRight, Bell, Boxes,
} from "lucide-react";
import { loadData, DestinaciónIT, Poliza } from "@/lib/abastecimiento-store";

const ROUTES: Record<string, { label: string; icon: React.ElementType; parent?: string; parentLabel?: string }> = {
  "/":                    { label: "Dashboard",           icon: LayoutDashboard },
  "/proveedores":         { label: "Proveedores",          icon: Building2,    parent: "/", parentLabel: "Dashboard" },
  "/compras":             { label: "Compras Nacionales",   icon: ShoppingCart,  parent: "/", parentLabel: "Dashboard" },
  "/importaciones-comunes": { label: "Importaciones",      icon: Globe,         parent: "/", parentLabel: "Dashboard" },
  "/importaciones":       { label: "Importaciones IT",     icon: Ship,          parent: "/", parentLabel: "Dashboard" },
  "/insumos":             { label: "Control de Insumos",   icon: FlaskConical,  parent: "/", parentLabel: "Dashboard" },
  "/stock":               { label: "Stock IT (aduanero)",  icon: Boxes,         parent: "/", parentLabel: "Dashboard" },
  "/destinaciones":       { label: "Destinaciones x Vencer", icon: Clock,       parent: "/", parentLabel: "Dashboard" },
  "/polizas":             { label: "Pólizas de Caución",   icon: Shield,        parent: "/", parentLabel: "Dashboard" },
  "/kpis":                { label: "KPIs",                 icon: BarChart3,     parent: "/", parentLabel: "Dashboard" },
  "/plan":                { label: "Plan de Acción",       icon: ClipboardList, parent: "/", parentLabel: "Dashboard" },
};

function diasRest(fecha: string): number | null {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const d = new Date(fecha); d.setHours(0,0,0,0);
  return Math.round((d.getTime()-hoy.getTime())/86400000);
}

function countAlertas(destinaciones: DestinaciónIT[], polizas: Poliza[]): number {
  let n = 0;
  destinaciones.forEach(d => {
    const dias = diasRest(d.fechaVencimiento);
    if (dias !== null && dias <= 15) n++;
  });
  polizas.forEach(p => {
    if (p.estado === "Dada de baja" || p.estado === "Baja solicitada") return;
    const dests = destinaciones.filter(d => p.destinacionesVinculadas.includes(d.numero));
    if (dests.length > 0 && dests.every(d => d.stockDocumental === 0)) n++;
  });
  return n;
}

export default function Topbar() {
  const path = usePathname();
  const route = ROUTES[path] ?? { label: "Sección", icon: LayoutDashboard };
  const Icon = route.icon;
  const [totalAlertas, setTotalAlertas] = useState(0);

  useEffect(() => {
    const d = loadData();
    setTotalAlertas(countAlertas(d.destinaciones ?? [], d.polizas ?? []));
  }, [path]);

  const hoy = new Date();
  const fechaStr = hoy.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });

  return (
    <header className="h-14 flex items-center px-6 gap-4 shrink-0 sticky top-0 z-20"
      style={{ background: "rgba(237,242,228,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(89,107,44,0.15)" }}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {route.parent && (
          <>
            <Link href={route.parent}
              className="text-xs text-gray-400 hover:text-olive-600 transition-colors font-medium">
              {route.parentLabel}
            </Link>
            <ChevronRight size={12} className="text-gray-300 shrink-0" />
          </>
        )}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-olive-50 flex items-center justify-center shrink-0">
            <Icon size={13} className="text-olive-600" />
          </div>
          <h2 className="text-sm font-bold text-gray-900 truncate">{route.label}</h2>
        </div>
      </div>

      {/* Right area */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Fecha */}
        <span className="text-xs text-gray-400 capitalize hidden sm:block">{fechaStr}</span>

        {/* Bell con badge */}
        <Link href="/destinaciones"
          className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell size={16} className="text-gray-500" />
          {totalAlertas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {totalAlertas > 9 ? "9+" : totalAlertas}
            </span>
          )}
        </Link>

        {/* Separador */}
        <div className="h-5 w-px bg-gray-200" />

        {/* Empresa */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #596b2c 0%, #596b2c 100%)" }}>
            <span className="text-white text-[10px] font-black">SC</span>
          </div>
          <span className="text-xs font-semibold text-gray-700 hidden md:block">Seville Cazorla</span>
        </div>
      </div>
    </header>
  );
}
