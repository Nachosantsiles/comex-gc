'use client'
import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES   = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

const EVENT_COLORS: Record<string, { dot: string; label: string }> = {
  eta:            { dot: '#4f46e5', label: 'ETA' },
  etd:            { dot: '#d97706', label: 'ETD' },
  salida:         { dot: '#f59e0b', label: 'Salida' },
  liberacion:     { dot: '#16a34a', label: 'Liberación' },
  oficializacion: { dot: '#0d9488', label: 'Oficialización' },
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun → convert to Mon-based (0=Mon)
  const d = new Date(year, month - 1, 1).getDay()
  return d === 0 ? 6 : d - 1
}
function pad(n: number) { return String(n).padStart(2, '0') }

export function MiniCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [events, setEvents] = useState<Record<string, any[]>>({})
  const [tooltip, setTooltip] = useState<{ date: string; x: number; y: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/calendar?year=${year}&month=${month}`)
      .then(r => r.ok ? r.json() : {})
      .then(setEvents)
      .catch(() => {})
  }, [year, month])

  // Close tooltip on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setTooltip(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function prev() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
    setTooltip(null)
  }
  function next() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
    setTooltip(null)
  }

  const daysInMonth  = getDaysInMonth(year, month)
  const firstDay     = getFirstDayOfMonth(year, month)
  const todayStr     = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  function toggleTooltip(e: React.MouseEvent, dateStr: string) {
    if (!events[dateStr]?.length) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const calRect = ref.current!.getBoundingClientRect()
    setTooltip(prev => prev?.date === dateStr ? null : {
      date: dateStr,
      x: rect.left - calRect.left + rect.width / 2,
      y: rect.bottom - calRect.top + 4,
    })
  }

  return (
    <div ref={ref} className="relative select-none px-3 pb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prev}
          className="p-0.5 rounded transition-colors"
          style={{ color: 'rgba(148,163,184,0.6)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.6)')}
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-[11px] font-semibold" style={{ color: 'rgba(226,232,240,0.85)' }}>
          {MONTHS_ES[month - 1]} {year}
        </span>
        <button
          onClick={next}
          className="p-0.5 rounded transition-colors"
          style={{ color: 'rgba(148,163,184,0.6)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.6)')}
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_ES.map(d => (
          <div key={d} className="text-center text-[9px] font-semibold uppercase" style={{ color: 'rgba(148,163,184,0.45)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr  = `${year}-${pad(month)}-${pad(day)}`
          const isToday  = dateStr === todayStr
          const dayEvents = events[dateStr] ?? []
          const hasEvents = dayEvents.length > 0

          return (
            <div
              key={i}
              onClick={e => toggleTooltip(e, dateStr)}
              className="flex flex-col items-center py-0.5 rounded cursor-default"
              style={hasEvents ? { cursor: 'pointer' } : {}}
            >
              <span
                className="text-[11px] w-5 h-5 flex items-center justify-center rounded-full leading-none font-medium"
                style={
                  isToday
                    ? { background: '#6B1A1A', color: '#fff', fontWeight: 700 }
                    : hasEvents
                    ? { color: 'rgba(226,232,240,0.9)' }
                    : { color: 'rgba(148,163,184,0.5)' }
                }
              >
                {day}
              </span>
              {/* Event dots */}
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <span
                      key={j}
                      className="w-1 h-1 rounded-full"
                      style={{ background: EVENT_COLORS[ev.type]?.dot ?? '#888' }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
        {Object.entries(EVENT_COLORS).map(([type, { dot, label }]) => (
          <div key={type} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
            <span className="text-[9px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && events[tooltip.date] && (
        <div
          className="absolute z-50 rounded-lg p-2.5 shadow-xl text-xs"
          style={{
            left: Math.max(0, tooltip.x - 80),
            top: tooltip.y,
            background: '#1e2a1a',
            border: '1px solid rgba(255,255,255,0.12)',
            minWidth: 160,
            maxWidth: 200,
          }}
        >
          <p className="font-semibold mb-1.5" style={{ color: 'rgba(226,232,240,0.9)', fontSize: 11 }}>
            {new Date(tooltip.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          {events[tooltip.date].map((ev, i) => (
            <div key={i} className="flex items-start gap-1.5 mb-1 last:mb-0">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: EVENT_COLORS[ev.type]?.dot ?? '#888' }} />
              <div>
                <span className="font-medium" style={{ color: EVENT_COLORS[ev.type]?.dot ?? '#888', fontSize: 10 }}>
                  {EVENT_COLORS[ev.type]?.label} ({ev.count})
                </span>
                {ev.labels && (
                  <p className="mt-0.5 leading-tight" style={{ color: 'rgba(148,163,184,0.7)', fontSize: 9.5 }}>
                    {ev.labels.split(' | ').slice(0, 3).join(', ')}
                    {ev.labels.split(' | ').length > 3 && '…'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
