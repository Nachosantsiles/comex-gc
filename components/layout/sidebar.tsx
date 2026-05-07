'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Ship, Package, Landmark, FileText,
  TruckIcon, BarChart3, Settings, LogOut, FolderOpen,
  BarChart2, Calendar,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

const sections = [
  {
    label: 'Operaciones',
    color: { primary: '#5C7A1E', light: '#7DA028', bg: 'rgba(92,122,30,0.30), rgba(92,122,30,0.08)' },
    items: [
      { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
      { href: '/envios',      label: 'Envíos',       icon: Ship },
      { href: '/items',       label: 'Ítems',        icon: Package },
      { href: '/calendario',  label: 'Calendario',   icon: Calendar },
    ],
  },
  {
    label: 'Aduana & Costos',
    color: { primary: '#1d6fa4', light: '#3b9fd4', bg: 'rgba(29,111,164,0.28), rgba(29,111,164,0.07)' },
    items: [
      { href: '/aduana',  label: 'Aduana',           icon: Landmark },
      { href: '/detalle', label: 'Detalle + GI',     icon: FileText },
      { href: '/gastos',  label: 'Gastos Logísticos',icon: TruckIcon },
    ],
  },
  {
    label: 'Análisis',
    color: { primary: '#1A6B52', light: '#27967A', bg: 'rgba(26,107,82,0.28), rgba(26,107,82,0.07)' },
    items: [
      { href: '/totales',    label: 'Total x Ítem', icon: BarChart3 },
      { href: '/reportes',   label: 'Reportes',     icon: BarChart2 },
      { href: '/documentos', label: 'Documentos',   icon: FolderOpen },
    ],
  },
  {
    label: 'Sistema',
    color: { primary: '#5C7A1E', light: '#7DA028', bg: 'rgba(92,122,30,0.30), rgba(92,122,30,0.08)' },
    items: [
      { href: '/admin', label: 'Administración', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as any
  const initial = user?.name?.[0]?.toUpperCase() ?? 'U'

  const currentSection = sections.find(s => s.items.some(i => pathname.startsWith(i.href)))
  const avatarColor = currentSection?.color ?? sections[0].color

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-56 flex flex-col z-40"
      style={{
        background: 'linear-gradient(180deg, #192116 0%, #111910 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Brand */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7DA028, #5C7A1E)', boxShadow: '0 2px 8px rgba(92,122,30,0.45)' }}
          >
            <Ship size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none tracking-wide">COMEX ARG</p>
            <p className="text-[11px] mt-1 leading-none font-medium" style={{ color: '#7DA028' }}>Grupo Cazorla</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 sidebar-scroll">
        {sections.map((section) => {
          const { color } = section
          return (
            <div key={section.label}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] px-3 mb-2" style={{ color: 'rgba(148,163,184,0.45)' }}>
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname.startsWith(href)
                  return (
                    <Link
                      key={href}
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
                      <Icon
                        size={16}
                        strokeWidth={active ? 2.5 : 1.75}
                        className={active ? '' : 'text-slate-500'}
                        style={active ? { color: color.light } : {}}
                      />
                      <span>{label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-default"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${avatarColor.light}, ${avatarColor.primary})` }}
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
    </aside>
  )
}
