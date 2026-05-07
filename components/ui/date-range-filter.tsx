'use client'
import { X, CalendarRange } from 'lucide-react'

interface Props {
  desde: string
  hasta: string
  onDesde: (v: string) => void
  onHasta: (v: string) => void
  onClear: () => void
}

export function DateRangeFilter({ desde, hasta, onDesde, onHasta, onClear }: Props) {
  const active = !!desde || !!hasta
  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      style={{
        background: active ? '#F5EEEE' : '#fff',
        border: `1px solid ${active ? '#9B2828' : '#e2e8f0'}`,
        borderRadius: '10px',
        padding: '6px 12px',
        transition: 'all 0.15s',
      }}
    >
      <CalendarRange size={14} style={{ color: active ? '#6B1A1A' : '#94a3b8', flexShrink: 0 }} />
      <span className="text-xs font-medium" style={{ color: active ? '#6B1A1A' : '#94a3b8' }}>Período:</span>
      <div className="flex items-center gap-1">
        <label className="text-xs text-slate-500">Desde</label>
        <input
          type="date"
          value={desde}
          onChange={e => onDesde(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-[#9B2828] bg-white"
          style={{ colorScheme: 'light' }}
        />
      </div>
      <div className="flex items-center gap-1">
        <label className="text-xs text-slate-500">Hasta</label>
        <input
          type="date"
          value={hasta}
          onChange={e => onHasta(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-[#9B2828] bg-white"
          style={{ colorScheme: 'light' }}
        />
      </div>
      {active && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
          style={{ color: '#6B1A1A', background: 'rgba(107,26,26,0.08)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(107,26,26,0.16)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(107,26,26,0.08)')}
        >
          <X size={11} />Limpiar
        </button>
      )}
    </div>
  )
}
