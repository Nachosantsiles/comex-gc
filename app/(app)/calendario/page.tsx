'use client'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Calendar, Clock, Ship, Landmark, TruckIcon, CheckCircle2 } from 'lucide-react'

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES   = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

const EVENT_TYPES: Record<string, { color: string; bg: string; border: string; label: string; icon: any }> = {
  eta:            { color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe', label: 'ETA llegada',     icon: Ship },
  etd:            { color: '#b45309', bg: '#fffbeb', border: '#fde68a', label: 'ETD salida',       icon: TruckIcon },
  salida:         { color: '#d97706', bg: '#fff7ed', border: '#fed7aa', label: 'Fecha salida',     icon: Ship },
  liberacion:     { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Liberación',       icon: CheckCircle2 },
  oficializacion: { color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', label: 'Oficialización',   icon: Landmark },
}

function pad(n: number) { return String(n).padStart(2, '0') }
function getDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }
function getFirstDayMon(y: number, m: number) {
  const d = new Date(y, m - 1, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export default function CalendarioPage() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [events, setEvents] = useState<Record<string, any[]>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<'mes' | 'agenda'>('mes')

  useEffect(() => {
    fetch(`/api/calendar?year=${year}&month=${month}`)
      .then(r => r.ok ? r.json() : {})
      .then(setEvents)
  }, [year, month])

  function prev() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
    setSelected(null)
  }
  function next() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
    setSelected(null)
  }
  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth() + 1)
    setSelected(null)
  }

  const todayStr    = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay    = getFirstDayMon(year, month)

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // Agenda: all events of the month sorted by date
  const agendaItems = Object.entries(events)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([date, evs]) => evs.map(ev => ({ date, ...ev })))

  const selectedEvents = selected ? (events[selected] ?? []) : []

  return (
    <div>
      <Topbar title="Calendario" />
      <div className="p-6 space-y-4">

        {/* Header controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              Hoy
            </button>
            <div className="flex items-center gap-1">
              <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                <ChevronLeft size={18} />
              </button>
              <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                <ChevronRight size={18} />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{MONTHS_ES[month-1]} {year}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 mr-3">
              {Object.entries(EVENT_TYPES).map(([type, cfg]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: cfg.color }} />
                  <span className="text-xs text-gray-500">{cfg.label}</span>
                </div>
              ))}
            </div>
            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
              <button
                onClick={() => setView('mes')}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={view === 'mes' ? { background: '#6B1A1A', color: '#fff' } : { color: '#64748b' }}
              >
                Mes
              </button>
              <button
                onClick={() => setView('agenda')}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={view === 'agenda' ? { background: '#6B1A1A', color: '#fff' } : { color: '#64748b' }}
              >
                Agenda
              </button>
            </div>
          </div>
        </div>

        {view === 'mes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Calendar grid */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 border-b border-gray-100">
                    {DAYS_ES.map(d => (
                      <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Cells */}
                  <div className="grid grid-cols-7">
                    {cells.map((day, i) => {
                      const isLast = i === cells.length - 1
                      const isLastRow = i >= cells.length - 7
                      if (!day) return (
                        <div
                          key={i}
                          className="h-24 border-r border-b border-gray-50"
                          style={isLastRow ? { borderBottom: 'none' } : {}}
                        />
                      )
                      const dateStr   = `${year}-${pad(month)}-${pad(day)}`
                      const isToday   = dateStr === todayStr
                      const isSelected = dateStr === selected
                      const dayEvs    = events[dateStr] ?? []
                      const hasEvents = dayEvs.length > 0

                      return (
                        <div
                          key={i}
                          onClick={() => setSelected(isSelected ? null : dateStr)}
                          className="h-24 p-1.5 border-r border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 flex flex-col"
                          style={{
                            borderBottom: isLastRow ? 'none' : undefined,
                            borderRight: (i + 1) % 7 === 0 ? 'none' : undefined,
                            background: isSelected ? '#FFF5F5' : undefined,
                          }}
                        >
                          {/* Day number */}
                          <div className="flex justify-end mb-1">
                            <span
                              className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold"
                              style={
                                isToday
                                  ? { background: '#6B1A1A', color: '#fff' }
                                  : isSelected
                                  ? { background: '#FEE2E2', color: '#6B1A1A', fontWeight: 700 }
                                  : { color: '#374151' }
                              }
                            >
                              {day}
                            </span>
                          </div>
                          {/* Events */}
                          <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                            {dayEvs.slice(0, 3).map((ev, j) => {
                              const cfg = EVENT_TYPES[ev.type]
                              if (!cfg) return null
                              return (
                                <div
                                  key={j}
                                  className="px-1 py-0.5 rounded text-[10px] font-medium truncate leading-tight"
                                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                                >
                                  {cfg.label} ({ev.count})
                                </div>
                              )
                            })}
                            {dayEvs.length > 3 && (
                              <span className="text-[10px] text-gray-400 px-1">+{dayEvs.length - 3} más</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Side panel */}
            <div>
              {selected && selectedEvents.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar size={15} className="text-[#6B1A1A]" />
                      {new Date(selected + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedEvents.map((ev, i) => {
                      const cfg = EVENT_TYPES[ev.type]
                      if (!cfg) return null
                      const IconComp = cfg.icon
                      return (
                        <div key={i} className="rounded-lg p-3" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <IconComp size={13} style={{ color: cfg.color }} />
                            <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                            <span className="ml-auto text-xs font-bold" style={{ color: cfg.color }}>{ev.count}</span>
                          </div>
                          {ev.labels && (
                            <div className="space-y-0.5">
                              {ev.labels.split(' | ').slice(0, 5).map((l: string, j: number) => (
                                <p key={j} className="text-xs text-gray-600 truncate">• {l}</p>
                              ))}
                              {ev.labels.split(' | ').length > 5 && (
                                <p className="text-xs text-gray-400">y {ev.labels.split(' | ').length - 5} más...</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Calendar size={28} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-400">Seleccioná un día<br />para ver los eventos</p>
                  </CardContent>
                </Card>
              )}

              {/* Upcoming events this month */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    Próximos eventos del mes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {Object.entries(events)
                    .filter(([d]) => d >= todayStr)
                    .sort(([a],[b]) => a.localeCompare(b))
                    .slice(0, 8)
                    .map(([date, evs]) => (
                      <div
                        key={date}
                        onClick={() => setSelected(date)}
                        className="flex items-start gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="text-center min-w-[32px]">
                          <p className="text-lg font-bold text-gray-800 leading-none">{parseInt(date.slice(8))}</p>
                          <p className="text-[10px] text-gray-400 uppercase">{MONTHS_ES[parseInt(date.slice(5,7))-1].slice(0,3)}</p>
                        </div>
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          {evs.map((ev, j) => {
                            const cfg = EVENT_TYPES[ev.type]
                            if (!cfg) return null
                            return (
                              <span key={j} className="text-xs truncate" style={{ color: cfg.color }}>
                                {cfg.label} ({ev.count})
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  }
                  {Object.entries(events).filter(([d]) => d >= todayStr).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">Sin eventos próximos</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {view === 'agenda' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Agenda — {MONTHS_ES[month-1]} {year}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {agendaItems.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-10">Sin eventos este mes</p>
              )}
              {agendaItems.map((ev, i) => {
                const cfg = EVENT_TYPES[ev.type]
                if (!cfg) return null
                const IconComp = cfg.icon
                const d = new Date(ev.date + 'T12:00:00')
                return (
                  <div key={i} className="flex items-start gap-4 px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <div className="min-w-[60px] text-right">
                      <p className="text-sm font-bold text-gray-700">
                        {d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">
                        {d.toLocaleDateString('es-AR', { weekday: 'short' })}
                      </p>
                    </div>
                    <div className="w-px self-stretch" style={{ background: cfg.color, opacity: 0.4 }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <IconComp size={13} style={{ color: cfg.color }} />
                        <span className="text-sm font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                        <span className="text-xs text-gray-400">({ev.count} elemento{ev.count !== 1 ? 's' : ''})</span>
                      </div>
                      {ev.labels && (
                        <p className="text-xs text-gray-500 truncate">
                          {ev.labels.split(' | ').slice(0, 4).join(', ')}
                          {ev.labels.split(' | ').length > 4 && '…'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
