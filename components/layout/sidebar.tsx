'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Ship, Package, Landmark, FileText,
  TruckIcon, BarChart3, Settings, LogOut, FolderOpen,
  BarChart2, Calendar, ShoppingCart, Users, ClipboardList,
  Shield, FlaskConical, BarChart, ListChecks, Boxes,
  LayoutGrid, ChevronRight, ArrowLeft, Wheat,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import type { Permission } from '@/lib/permissions'

/* ─── COMEX sections ─── */
const comexColor = { primary: '#5C7A1E', light: '#7DA028', bg: 'rgba(92,122,30,0.30), rgba(92,122,30,0.08)' }

const comexSections = [
  {
    label: 'Operaciones',
    color: { primary: '#5C7A1E', light: '#7DA028', bg: 'rgba(92,122,30,0.30), rgba(92,122,30,0.08)' },
    items: [
      { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard, permission: 'dashboard:view' as Permission },
      { href: '/envios',     label: 'Envíos',       icon: Ship,            permission: 'envios:view' as Permission },
      { href: '/items',      label: 'Ítems',        icon: Package,         permission: 'items:view' as Permission },
      { href: '/calendario', label: 'Calendario',   icon: Calendar,        permission: 'calendario:view' as Permission },
    ],
  },
  {
    label: 'Aduana & Costos',
    color: { primary: '#1d6fa4', light: '#3b9fd4', bg: 'rgba(29,111,164,0.28), rgba(29,111,164,0.07)' },
    items: [
      { href: '/aduana',  label: 'Aduana',            icon: Landmark,  permission: 'aduana:view' as Permission },
      { href: '/detalle', label: 'Detalle + GI',      icon: FileText,  permission: 'detalle:view' as Permission },
      { href: '/gastos',  label: 'Gastos Logísticos', icon: TruckIcon, permission: 'gastos:view' as Permission },
    ],
  },
  {
    label: 'Análisis',
    color: { primary: '#1A6B52', light: '#27967A', bg: 'rgba(26,107,82,0.28), rgba(26,107,82,0.07)' },
    items: [
      { href: '/totales',    label: 'Total x Ítem', icon: BarChart3,  permission: 'totales:view' as Permission },
      { href: '/reportes',   label: 'Reportes',     icon: BarChart2,  permission: 'reportes:view' as Permission },
      { href: '/documentos', label: 'Documentos',   icon: FolderOpen, permission: 'documentos:view' as Permission },
    ],
  },
  {
    label: 'Sistema',
    color: { primary: '#5C7A1E', light: '#7DA028', bg: 'rgba(92,122,30,0.30), rgba(92,122,30,0.08)' },
    items: [
      { href: '/admin', label: 'Administración', icon: Settings, permission: 'admin:view' as Permission },
    ],
  },
]

/* ─── Abastecimiento items ─── */
const abastColor = { primary: '#8B6914', light: '#C49A20', bg: 'rgba(139,105,20,0.32), rgba(139,105,20,0.09)' }

const abastItems = [
  { href: '/abastecimiento-dashboard', label: 'Dashboard',         icon: LayoutGrid,    permission: 'abastecimiento_dashboard:view' as Permission },
  { href: '/compras',                  label: 'Compras / OC',       icon: ShoppingCart,  permission: 'compras:view' as Permission },
  { href: '/proveedores',              label: 'Proveedores',        icon: Users,         permission: 'proveedores:view' as Permission },
  { href: '/insumos',                  label: 'Insumos',            icon: FlaskConical,  permission: 'insumos:view' as Permission },
  { href: '/stock',                    label: 'Stock',              icon: Boxes,         permission: 'stock:view' as Permission },
  { href: '/destinaciones',            label: 'Destinaciones',      icon: ClipboardList, permission: 'destinaciones_abast:view' as Permission },
  { href: '/polizas',                  label: 'Pólizas de Caución', icon: Shield,        permission: 'polizas:view' as Permission },
  { href: '/kpis',                     label: 'KPIs',               icon: BarChart,      permission: 'kpis:view' as Permission },
  { href: '/plan',                     label: 'Plan de Acción',     icon: ListChecks,    permission: 'plan:view' as Permission },
]

const COMEX_HREFS   = comexSections.flatMap(s => s.items.map(i => i.href))
const ABAST_HREFS   = abastItems.map(i => i.href)

/* ─── Shared user footer ─── */
function UserFooter({ primary, light }: { primary: string; light: string }) {
  const { data: session } = useSession()
  const user = session?.user as any
  const initial = user?.name?.[0]?.toUpperCase() ?? 'U'
  return (
    <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${light}, ${primary})` }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-200 text-xs font-semibold truncate leading-none">{user?.name ?? 'Usuario'}</p>
          <p className="text-slate-500 text-[11px] mt-0.5 capitalize truncate leading-none">{user?.role ?? ''}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Cerrar sesión"
          className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
          style={{ color: 'rgba(148,163,184,0.6)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut size={13} />
        </button>
      </div>
    </div>
  )
}

/* ─── Back button ─── */
function BackBtn({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 mb-4 group w-fit">
      <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" style={{ color }} />
      <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
    </Link>
  )
}

/* ─── Nav link ─── */
function NavLink({ href, label, icon: Icon, active, color }: {
  href: string; label: string; icon: any; active: boolean
  color: { primary: string; light: string; bg: string }
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
        active ? 'text-white' : 'text-slate-400 hover:text-slate-100'
      )}
      style={active ? {
        background: `linear-gradient(90deg, ${color.bg})`,
        borderLeft: `2px solid ${color.primary}`,
        paddingLeft: '10px',
      } : { borderLeft: '2px solid transparent' }}
    >
      <Icon size={16} strokeWidth={active ? 2.5 : 1.75} className={active ? '' : 'text-slate-500'} style={active ? { color: color.light } : {}} />
      <span>{label}</span>
    </Link>
  )
}

/* ══════════════════════════════════════════════
   SIDEBAR COMPONENT
══════════════════════════════════════════════ */
export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const permissions: string[] = (session?.user as any)?.permissions ?? []

  const inComex = COMEX_HREFS.some(h => pathname.startsWith(h))
  const inAbast = ABAST_HREFS.some(h => pathname.startsWith(h))

  /* ══ MODO COMEX ══ */
  if (inComex) {
    const visibleSections = comexSections
      .map(s => ({ ...s, items: s.items.filter(i => permissions.includes(i.permission)) }))
      .filter(s => s.items.length > 0)

    return (
      <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col z-40"
        style={{ background: 'linear-gradient(180deg, #192116 0%, #111910 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <BackBtn href="/home" label="Módulos" color="rgba(125,160,40,0.55)" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7DA028, #5C7A1E)', boxShadow: '0 2px 8px rgba(92,122,30,0.45)' }}>
              <Ship size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none tracking-wide">COMEX ARG</p>
              <p className="text-[11px] mt-1 leading-none font-medium" style={{ color: '#7DA028' }}>Grupo Cazorla</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 sidebar-scroll">
          {visibleSections.map(section => (
            <div key={section.label}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] px-3 mb-2" style={{ color: 'rgba(148,163,184,0.45)' }}>
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon }) => (
                  <NavLink key={href} href={href} label={label} icon={icon}
                    active={pathname.startsWith(href)} color={section.color} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <UserFooter primary={comexColor.primary} light={comexColor.light} />
      </aside>
    )
  }

  /* ══ MODO ABASTECIMIENTO ══ */
  if (inAbast) {
    const visible = abastItems.filter(i => permissions.includes(i.permission))
    return (
      <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col z-40"
        style={{ background: 'linear-gradient(180deg, #1a1608 0%, #110f05 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <BackBtn href="/home" label="Módulos" color="rgba(196,154,32,0.55)" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #C49A20, #8B6914)', boxShadow: '0 2px 8px rgba(139,105,20,0.5)' }}>
              <Wheat size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none tracking-wide">Abastecimiento</p>
              <p className="text-[11px] mt-1 leading-none font-medium" style={{ color: '#C49A20' }}>Grupo Cazorla</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 sidebar-scroll">
          {visible.map(({ href, label, icon }) => (
            <NavLink key={href} href={href} label={label} icon={icon}
              active={pathname.startsWith(href)} color={abastColor} />
          ))}
        </nav>

        <UserFooter primary={abastColor.primary} light={abastColor.light} />
      </aside>
    )
  }

  /* ══ MODO LAUNCHER (home / rutas no reconocidas) ══ */
  const canComex = COMEX_HREFS.some(h => permissions.includes(
    comexSections.flatMap(s => s.items).find(i => i.href === h)?.permission ?? ''
  ))
  const canAbast = abastItems.some(i => permissions.includes(i.permission))

  type ModuleItem = {
    href: string; icon: React.ElementType; label: string; sub: string
    iconBg: string; shadow: string; accent: string; light: string
    activeBg: string; activeBorder: string
  }
  const modules: ModuleItem[] = [
    canComex && {
      href: '/dashboard',
      icon: Ship,
      label: 'COMEX ARG',
      sub: 'Comercio Exterior',
      iconBg: 'linear-gradient(135deg, #7DA028, #5C7A1E)',
      shadow: '0 2px 8px rgba(92,122,30,0.4)',
      accent: '#5C7A1E',
      light: '#7DA028',
      activeBg: 'rgba(92,122,30,0.15)',
      activeBorder: 'rgba(92,122,30,0.3)',
    },
    canAbast && {
      href: '/abastecimiento-dashboard',
      icon: Wheat,
      label: 'Abastecimiento',
      sub: 'Insumos & Proveedores',
      iconBg: 'linear-gradient(135deg, #C49A20, #8B6914)',
      shadow: '0 2px 8px rgba(139,105,20,0.45)',
      accent: '#8B6914',
      light: '#C49A20',
      activeBg: 'rgba(139,105,20,0.15)',
      activeBorder: 'rgba(139,105,20,0.3)',
    },
  ].filter(Boolean) as ModuleItem[]

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col z-40"
      style={{ background: 'linear-gradient(180deg, #141914 0%, #0d110d 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Brand */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(148,163,184,0.4)' }}>Grupo Cazorla</p>
        <p className="text-white font-bold text-base leading-tight tracking-wide">Sistema de<br/>Gestión</p>
      </div>

      {/* Module launchers */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-2 sidebar-scroll">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 mb-3" style={{ color: 'rgba(148,163,184,0.4)' }}>
          Módulos
        </p>
        {modules.map(m => (
          <Link
            key={m.href}
            href={m.href}
            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group"
            style={{ background: m.activeBg, border: `1px solid ${m.activeBorder}` }}
            onMouseEnter={e => (e.currentTarget.style.background = m.activeBg.replace('0.15', '0.25'))}
            onMouseLeave={e => (e.currentTarget.style.background = m.activeBg)}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: m.iconBg, boxShadow: m.shadow }}>
              <m.icon size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-semibold leading-none truncate">{m.label}</p>
              <p className="text-[11px] mt-1 leading-none truncate" style={{ color: m.light }}>{m.sub}</p>
            </div>
            <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </nav>

      <UserFooter primary="#5C7A1E" light="#7DA028" />
    </aside>
  )
}
