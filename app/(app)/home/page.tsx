"use client";
import Link from "next/link";
import { Ship, Wheat, ChevronRight } from "lucide-react";

const modules = [
  {
    href: "/dashboard",
    icon: Ship,
    iconBg: "linear-gradient(135deg, #7DA028, #5C7A1E)",
    iconShadow: "0 4px 16px rgba(92,122,30,0.45)",
    accent: "#5C7A1E",
    accentLight: "#7DA028",
    label: "COMEX ARG",
    sub: "Comercio Exterior",
    desc: "Envíos, aduana, gastos logísticos, reportes y documentos.",
    badge: "bg-green-100 text-green-800",
  },
  {
    href: "/abastecimiento-dashboard",
    icon: Wheat,
    iconBg: "linear-gradient(135deg, #C49A20, #8B6914)",
    iconShadow: "0 4px 16px rgba(139,105,20,0.5)",
    accent: "#8B6914",
    accentLight: "#C49A20",
    label: "Abastecimiento",
    sub: "Gestión de insumos",
    desc: "Proveedores, insumos, stock, OC, pólizas y plan de acción.",
    badge: "bg-amber-100 text-amber-800",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Grupo Cazorla</p>
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Gestión</h1>
          <p className="text-gray-500 mt-2">Seleccioná el módulo al que querés acceder</p>
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-1 gap-4">
          {modules.map(m => (
            <Link
              key={m.href}
              href={m.href}
              className="group bg-white border border-gray-200 rounded-2xl px-6 py-5 flex items-center gap-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              style={{ borderLeft: `4px solid ${m.accent}` }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: m.iconBg, boxShadow: m.iconShadow }}
              >
                <m.icon size={22} className="text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-gray-900 text-base">{m.label}</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.badge}`}>{m.sub}</span>
                </div>
                <p className="text-sm text-gray-500">{m.desc}</p>
              </div>
              <ChevronRight
                size={20}
                className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
