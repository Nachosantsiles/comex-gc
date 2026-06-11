'use client'
import { useEffect, useRef, useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtUSD, fmtDate } from '@/lib/utils'
import {
  BarChart2, Clock, DollarSign, TruckIcon, Landmark, Package,
  Save, Trash2, ChevronRight, Timer, FileText,
} from 'lucide-react'
import { DateRangeFilter } from '@/components/ui/date-range-filter'

function fmtDate(str: string) {
  return str ? str.slice(0, 16).replace('T', ' ') : '—'
}
function pct(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}
function avgArr(arr: number[]) {
  if (!arr.length) return null
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
}

const estadoColors: Record<string, any> = {
  'Depósito Origen': 'secondary', 'Puerto Origen': 'default', 'En tránsito': 'warning',
  'Puerto Destino': 'default', 'Zona Primaria LR': 'orange', 'Depósito Fiscal': 'success',
  'Entregado': 'success', 'Finalizado': 'success',
}
const docColors: Record<string, any> = {
  'Pendiente': 'secondary', 'En Preparación': 'default', 'Observado': 'danger',
  'Aprobado': 'success', 'Finalizado': 'success',
}

export default function ReportesPage() {
  const [gestiones, setGestiones] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<any | null>(null)
  const [historial, setHistorial] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notas, setNotas] = useState('')
  const [showNotasInput, setShowNotasInput] = useState(false)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  function buildQS(extra?: Record<string, string>) {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, v))
    const qs = p.toString()
    return qs ? `?${qs}` : ''
  }

  async function loadGestiones() {
    const r = await fetch(`/api/reportes/gestion${buildQS()}`)
    setGestiones(await r.json())
  }

  async function loadDetail(g: string) {
    setLoading(true)
    setDetail(null)
    const [dr, hr] = await Promise.all([
      fetch(`/api/reportes/gestion${buildQS({ gestion: g })}`).then(r => r.json()),
      fetch(`/api/reportes/historial?gestion=${encodeURIComponent(g)}`).then(r => r.json()),
    ])
    setDetail(dr)
    setHistorial(hr)
    setLoading(false)
  }

  useEffect(() => { loadGestiones() }, [desde, hasta])
  useEffect(() => { if (selected) loadDetail(selected) }, [desde, hasta])

  function selectGestion(g: string) {
    setSelected(g)
    loadDetail(g)
    setShowNotasInput(false)
    setNotas('')
  }

  async function guardarSnapshot() {
    if (!selected || !detail) return
    setSaving(true)
    const { kpis } = detail
    await fetch('/api/reportes/historial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...kpis, gestion: selected, notas }),
    })
    setNotas('')
    setShowNotasInput(false)
    const hr = await fetch(`/api/reportes/historial?gestion=${encodeURIComponent(selected)}`).then(r => r.json())
    setHistorial(hr)
    setSaving(false)
  }

  async function eliminarSnapshot(id: number) {
    if (!confirm('¿Eliminar este snapshot?')) return
    await fetch(`/api/reportes/historial/${id}`, { method: 'DELETE' })
    setHistorial(prev => prev.filter(h => h.id !== id))
  }

  const kpis = detail?.kpis
  const items: any[] = detail?.items ?? []

  return (
    <div>
      <Topbar title="Reportes por Gestión" actions={
        <DateRangeFilter desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} onClear={() => { setDesde(''); setHasta('') }} />
      } />
      <div className="p-6 flex gap-5 h-[calc(100vh-64px)]">

        {/* Panel izquierdo */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3">
          <Card className="flex-1 overflow-y-auto p-0">
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gestiones</p>
            </div>
            <div className="divide-y divide-gray-50">
              {gestiones.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Sin gestiones</p>
              )}
              {gestiones.map((g: any) => {
                const active = selected === g.gestion
                return (
                  <button
                    key={g.gestion}
                    onClick={() => selectGestion(g.gestion)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-[#F5EEEE] border-l-2 border-[#6B1A1A]' : 'hover:bg-gray-50 border-l-2 border-transparent'}`}
                  >
                    <FileText size={16} className={active ? 'text-[#6B1A1A]' : 'text-gray-400'} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${active ? 'text-[#4A1010]' : 'text-gray-700'}`}>{g.gestion}</p>
                      <p className="text-xs text-gray-400">{g.total_items} ítem{g.total_items !== 1 ? 's' : ''}</p>
                    </div>
                    {active && <ChevronRight size={14} className="text-[#9B2828]" />}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Panel derecho */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0">
          {!selected ? (
            <Card className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <BarChart2 size={48} className="text-gray-200" />
              <p className="text-gray-400 font-medium">Seleccioná una gestión para ver el reporte</p>
            </Card>
          ) : loading ? (
            <Card className="flex-1 flex items-center justify-center">
              <p className="text-gray-400">Cargando...</p>
            </Card>
          ) : kpis && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selected}</h2>
                  <p className="text-sm text-gray-500">{kpis.total_items} ítems · {fmtUSD(kpis.total_cartera_usd)} cartera total</p>
                </div>
                <div className="flex gap-2 items-center">
                  {showNotasInput ? (
                    <>
                      <input
                        value={notas}
                        onChange={e => setNotas(e.target.value)}
                        placeholder="Notas del snapshot (opcional)"
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]"
                        onKeyDown={e => { if (e.key === 'Enter') guardarSnapshot(); if (e.key === 'Escape') setShowNotasInput(false) }}
                        autoFocus
                      />
                      <Button onClick={guardarSnapshot} disabled={saving}>
                        <Save size={15} />{saving ? 'Guardando...' : 'Confirmar'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowNotasInput(false)}>Cancelar</Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setShowNotasInput(true)}>
                      <Save size={15} />Guardar snapshot
                    </Button>
                  )}
                </div>
              </div>

              {/* KPIs Financieros */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <DollarSign size={13} />KPIs Financieros
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SmallKpi label="Total Cartera" value={fmtUSD(kpis.total_cartera_usd)} color="blue" bold />
                  <SmallKpi label="Promedio / Ítem" value={fmtUSD(kpis.promedio_por_item_usd)} color="purple" />
                  <SmallKpi label="Mercadería" value={`${fmtUSD(kpis.total_mercaderia_usd)} (${pct(kpis.total_mercaderia_usd, kpis.total_cartera_usd)}%)`} color="indigo" />
                  <SmallKpi label="Comisión SF" value={`${fmtUSD(kpis.total_sf_usd - kpis.total_mercaderia_usd)} (${pct(kpis.total_sf_usd - kpis.total_mercaderia_usd, kpis.total_cartera_usd)}%)`} color="violet" />
                  <SmallKpi label="GI (tributos)" value={`${fmtUSD(kpis.total_gi_usd)} (${pct(kpis.total_gi_usd, kpis.total_cartera_usd)}%)`} color="amber" />
                  <SmallKpi label="Logística" value={`${fmtUSD(kpis.total_log_usd)} (${pct(kpis.total_log_usd, kpis.total_cartera_usd)}%)`} color="green" />
                  <SmallKpi label="Honorarios" value={`${fmtUSD(kpis.total_honorarios_usd)} (${pct(kpis.total_honorarios_usd, kpis.total_cartera_usd)}%)`} color="rose" />
                  <SmallKpi label="Otros Gastos" value={`${fmtUSD(kpis.total_otros_usd)} (${pct(kpis.total_otros_usd, kpis.total_cartera_usd)}%)`} color="teal" />
                </div>
              </div>

              {/* KPIs de Tiempo */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Timer size={13} />KPIs de Tiempos
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <SmallKpi label="Días Tránsito" value={kpis.dias_transito_avg != null ? `${kpis.dias_transito_avg} días` : '—'} color="blue" sub="salida → llegada puerto" />
                  <SmallKpi label="Días Aduana" value={kpis.dias_aduana_avg != null ? `${kpis.dias_aduana_avg} días` : '—'} color="amber" sub="oficial. → liberación" />
                  <SmallKpi label="Ciclo Total" value={kpis.dias_ciclo_avg != null ? `${kpis.dias_ciclo_avg} días` : '—'} color="purple" sub="carga → liberación" />
                  <SmallKpi
                    label="Ítems Retrasados"
                    value={kpis.items_retrasados}
                    color={kpis.items_retrasados > 0 ? 'red' : 'green'}
                    sub="ETA vencida, sin liberar"
                  />
                  <SmallKpi label="Liberados" value={kpis.items_liberados} color="green" sub={`de ${kpis.total_items} ítems`} />
                </div>
              </div>

              {/* Tabla de ítems */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm"><Package size={15} />Ítems en esta gestión</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['ID Ítem', 'Detalle', 'Envío', 'Estado', 'Doc.', 'ETA', 'Mercadería', 'GI', 'Logística', 'Total', 'Tránsito', 'Aduana', 'Ciclo'].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 && (
                        <tr><td colSpan={13} className="text-center py-8 text-gray-400">Sin ítems</td></tr>
                      )}
                      {items.map(r => (
                        <tr key={r.id_item} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-3 py-2.5 font-medium text-[#6B1A1A] whitespace-nowrap">{r.id_item}</td>
                          <td className="px-3 py-2.5 max-w-[100px] truncate text-gray-700">{r.detalle || '—'}</td>
                          <td className="px-3 py-2.5 text-[#6B1A1A] whitespace-nowrap">{r.id_envio}</td>
                          <td className="px-3 py-2.5"><Badge variant={estadoColors[r.estado] ?? 'secondary'} className="text-xs">{r.estado ?? '—'}</Badge></td>
                          <td className="px-3 py-2.5"><Badge variant={docColors[r.estado_documentacion] ?? 'secondary'} className="text-xs">{r.estado_documentacion ?? '—'}</Badge></td>
                          <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(r.eta)}</td>
                          <td className="px-3 py-2.5 text-right">{fmtUSD(r.mercaderia_usd)}</td>
                          <td className="px-3 py-2.5 text-right">{fmtUSD(r.total_gi_usd)}</td>
                          <td className="px-3 py-2.5 text-right">{fmtUSD(r.total_log_usd)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-[#4A1010]">{fmtUSD(r.total_operacion_usd)}</td>
                          <td className="px-3 py-2.5 text-center text-gray-500">{r.dias_transito != null ? `${r.dias_transito}d` : '—'}</td>
                          <td className="px-3 py-2.5 text-center text-gray-500">{r.dias_aduana != null ? `${r.dias_aduana}d` : '—'}</td>
                          <td className="px-3 py-2.5 text-center text-gray-500">{r.dias_ciclo != null ? `${r.dias_ciclo}d` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    {items.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                          <td colSpan={6} className="px-3 py-2.5 text-xs text-gray-500">Totales / Promedios</td>
                          <td className="px-3 py-2.5 text-right">{fmtUSD(items.reduce((s, r) => s + r.mercaderia_usd, 0))}</td>
                          <td className="px-3 py-2.5 text-right">{fmtUSD(items.reduce((s, r) => s + r.total_gi_usd, 0))}</td>
                          <td className="px-3 py-2.5 text-right">{fmtUSD(items.reduce((s, r) => s + r.total_log_usd, 0))}</td>
                          <td className="px-3 py-2.5 text-right text-[#4A1010]">{fmtUSD(items.reduce((s, r) => s + r.total_operacion_usd, 0))}</td>
                          <td className="px-3 py-2.5 text-center">
                            {(() => { const v = avgArr(items.filter(r => r.dias_transito != null).map(r => r.dias_transito)); return v != null ? `~${v}d` : '—' })()}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {(() => { const v = avgArr(items.filter(r => r.dias_aduana != null).map(r => r.dias_aduana)); return v != null ? `~${v}d` : '—' })()}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {(() => { const v = avgArr(items.filter(r => r.dias_ciclo != null).map(r => r.dias_ciclo)); return v != null ? `~${v}d` : '—' })()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </Card>

              {/* Historial de snapshots */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Clock size={15} />Historial de snapshots
                    <span className="text-xs font-normal text-gray-400 ml-1">({historial.length} guardado{historial.length !== 1 ? 's' : ''})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {historial.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Sin snapshots guardados. Usá "Guardar snapshot" para registrar el estado actual.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {historial.map((h: any, idx: number) => {
                        const isLatest = idx === 0
                        const prev = historial[idx + 1]
                        const deltaCosto = prev ? h.total_cartera_usd - prev.total_cartera_usd : null
                        const deltaTransito = (prev && h.dias_transito_avg != null && prev.dias_transito_avg != null)
                          ? h.dias_transito_avg - prev.dias_transito_avg : null

                        return (
                          <div key={h.id} className={`flex gap-4 ${idx < historial.length - 1 ? 'pb-3 border-b border-gray-100' : ''}`}>
                            {/* Timeline dot */}
                            <div className="flex flex-col items-center pt-1">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isLatest ? 'bg-[#6B1A1A]' : 'bg-gray-300'}`} />
                              {idx < historial.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[16px]" />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-semibold text-gray-700">
                                    {fmtDate(h.created_at)}
                                    {isLatest && <span className="ml-2 text-[#9B2828] font-normal">— más reciente</span>}
                                  </p>
                                  {h.notas && <p className="text-xs text-gray-500 mt-0.5 italic">"{h.notas}"</p>}
                                  {h.usuario && <p className="text-xs text-gray-400">por {h.usuario}</p>}
                                </div>
                                <button
                                  onClick={() => eliminarSnapshot(h.id)}
                                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                                  title="Eliminar snapshot"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>

                              <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                                <SnapStat label="Cartera" value={fmtUSD(h.total_cartera_usd)} delta={deltaCosto != null ? { v: deltaCosto, fmt: fmtUSD } : undefined} />
                                <SnapStat label="Ítems" value={String(h.total_items)} />
                                <SnapStat label="Tránsito" value={h.dias_transito_avg != null ? `${h.dias_transito_avg}d` : '—'} delta={deltaTransito != null ? { v: deltaTransito, fmt: (v: number) => `${v}d` } : undefined} />
                                <SnapStat label="Aduana" value={h.dias_aduana_avg != null ? `${h.dias_aduana_avg}d` : '—'} />
                                <SnapStat label="Ciclo" value={h.dias_ciclo_avg != null ? `${h.dias_ciclo_avg}d` : '—'} />
                                <SnapStat label="Liberados" value={String(h.items_liberados)} />
                                {h.items_retrasados > 0 && <SnapStat label="Retrasados" value={String(h.items_retrasados)} warn />}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const colorMap: Record<string, string> = {
  blue:   'bg-[#F5EEEE] text-[#4A1010]',
  purple: 'bg-purple-50 text-purple-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  violet: 'bg-violet-50 text-violet-700',
  amber:  'bg-amber-50 text-amber-700',
  green:  'bg-green-50 text-green-700',
  teal:   'bg-teal-50 text-teal-700',
  rose:   'bg-rose-50 text-rose-700',
  red:    'bg-red-50 text-red-700',
}

function SmallKpi({ label, value, color, bold, sub }: {
  label: string; value: string | number; color: string; bold?: boolean; sub?: string
}) {
  const cls = colorMap[color] ?? colorMap.blue
  return (
    <div className={`rounded-xl px-4 py-3 ${cls}`}>
      <p className="text-xs opacity-70 mb-0.5">{label}</p>
      <p className={`${bold ? 'text-base' : 'text-sm'} font-bold leading-tight`}>{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

function SnapStat({ label, value, delta, warn }: {
  label: string; value: string; warn?: boolean
  delta?: { v: number; fmt: (v: number) => string }
}) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${warn ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
      <span className="text-gray-400">{label}:</span>
      <span className="font-medium">{value}</span>
      {delta && delta.v !== 0 && (
        <span className={delta.v > 0 ? 'text-red-500' : 'text-green-600'}>
          {delta.v > 0 ? '▲' : '▼'} {delta.fmt(Math.abs(delta.v))}
        </span>
      )}
    </span>
  )
}
