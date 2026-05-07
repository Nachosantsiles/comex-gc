'use client'
import { useEffect, useRef, useState } from 'react'
import { Bell, AlertTriangle, Clock, FileX, ShieldAlert, Info } from 'lucide-react'
import Link from 'next/link'

function timeAgo(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  if (diff > 0) return `en ${diff}d`
  return `hace ${Math.abs(diff)}d`
}

type Alert = {
  id_item?: string
  detalle?: string
  eta?: string
  estado?: string
  id_envio?: string
  estado_documentacion?: string
  id_despacho?: string
  canal?: string
}

export function AlertsBell() {
  const [data, setData] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'retrasados' | 'urgentes' | 'docs' | 'rojo'>('retrasados')
  const ref = useRef<HTMLDivElement>(null)

  function load() {
    fetch('/api/alertas').then(r => r.ok ? r.json() : null).then(d => d && setData(d))
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setInterval(load, 5 * 60 * 1000) // refresh every 5 min
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const total = data?.total ?? 0
  const urgent = (data?.retrasados?.length ?? 0) + (data?.canal_rojo?.length ?? 0)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: total > 0 ? (urgent > 0 ? '#ef4444' : '#f59e0b') : 'rgba(100,116,139,0.7)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        title="Alertas"
      >
        <Bell size={18} className={total > 0 ? 'animate-[bell_1s_ease-in-out]' : ''} />
        {total > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
            style={{
              background: urgent > 0 ? '#ef4444' : '#f59e0b',
              minWidth: 16, height: 16, padding: '0 3px',
            }}
          >
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 rounded-xl shadow-2xl overflow-hidden"
          style={{
            width: 340,
            background: '#fff',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-gray-500" />
              <span className="font-semibold text-sm text-gray-800">Alertas activas</span>
              {total > 0 && (
                <span className="text-xs font-bold rounded-full px-2 py-0.5" style={{ background: '#FEF2F2', color: '#ef4444' }}>
                  {total}
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-1 pt-1">
            {([
              { key: 'retrasados', label: 'Retrasados', count: data?.retrasados?.length ?? 0, color: '#ef4444' },
              { key: 'urgentes',   label: 'Urgentes',   count: data?.etas_urgentes?.length ?? 0, color: '#f59e0b' },
              { key: 'docs',       label: 'Docs',        count: data?.docs_observados?.length ?? 0, color: '#8b5cf6' },
              { key: 'rojo',       label: 'Canal Rojo', count: data?.canal_rojo?.length ?? 0, color: '#dc2626' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px"
                style={tab === t.key
                  ? { color: t.color, borderColor: t.color, background: 'transparent' }
                  : { color: '#94a3b8', borderColor: 'transparent' }
                }
              >
                {t.label}
                {t.count > 0 && (
                  <span className="rounded-full px-1.5 text-white text-[9px] font-bold" style={{ background: t.color }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
            {tab === 'retrasados' && (
              <AlertList
                items={data?.retrasados ?? []}
                icon={<AlertTriangle size={13} className="text-red-500" />}
                empty="Sin ítems retrasados"
                renderItem={(a: Alert) => (
                  <div>
                    <p className="text-xs font-medium text-gray-800 truncate">{a.detalle || a.id_item}</p>
                    <p className="text-[11px] text-gray-400">{a.id_item} · ETA: <span className="text-red-500 font-medium">{a.eta} ({timeAgo(a.eta!)})</span></p>
                  </div>
                )}
              />
            )}
            {tab === 'urgentes' && (
              <AlertList
                items={data?.etas_urgentes ?? []}
                icon={<Clock size={13} className="text-amber-500" />}
                empty="Sin ETAs urgentes en los próximos 3 días"
                renderItem={(a: Alert) => (
                  <div>
                    <p className="text-xs font-medium text-gray-800 truncate">{a.detalle || a.id_item}</p>
                    <p className="text-[11px] text-gray-400">{a.id_item} · ETA: <span className="text-amber-600 font-medium">{a.eta} ({timeAgo(a.eta!)})</span></p>
                  </div>
                )}
              />
            )}
            {tab === 'docs' && (
              <AlertList
                items={data?.docs_observados ?? []}
                icon={<FileX size={13} className="text-purple-500" />}
                empty="Sin documentos observados"
                renderItem={(a: Alert) => (
                  <div>
                    <p className="text-xs font-medium text-gray-800 truncate">{a.detalle || a.id_item}</p>
                    <p className="text-[11px] text-gray-400">{a.id_item} · <span className="text-purple-600 font-medium">{a.estado_documentacion}</span></p>
                  </div>
                )}
              />
            )}
            {tab === 'rojo' && (
              <AlertList
                items={data?.canal_rojo ?? []}
                icon={<ShieldAlert size={13} className="text-red-600" />}
                empty="Sin despachos en canal rojo"
                renderItem={(a: Alert) => (
                  <div>
                    <p className="text-xs font-medium text-gray-800 truncate">{a.detalle || a.id_item}</p>
                    <p className="text-[11px] text-gray-400">Despacho: <span className="text-red-600 font-medium">{a.id_despacho}</span></p>
                  </div>
                )}
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 flex justify-between items-center" style={{ borderTop: '1px solid #e2e8f0' }}>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="text-xs font-medium hover:underline"
              style={{ color: '#6B1A1A' }}
            >
              Ver Dashboard →
            </Link>
            <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600">Actualizar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function AlertList({ items, icon, empty, renderItem }: {
  items: any[]
  icon: React.ReactNode
  empty: string
  renderItem: (item: any) => React.ReactNode
}) {
  if (!items.length) return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
      <Info size={20} className="mb-2 opacity-40" />
      <p className="text-xs">{empty}</p>
    </div>
  )
  return (
    <div className="divide-y divide-gray-50">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
          <div className="mt-0.5 flex-shrink-0">{icon}</div>
          {renderItem(item)}
        </div>
      ))}
    </div>
  )
}
