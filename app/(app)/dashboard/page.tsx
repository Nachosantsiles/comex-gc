'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Ship, Package, Landmark, AlertTriangle, Clock, TruckIcon,
  DollarSign, BarChart2, Timer, CheckCircle2, AlertCircle, Download,
} from 'lucide-react'
import { fmtUSD } from '@/lib/utils'
import { DateRangeFilter } from '@/components/ui/date-range-filter'
import { Button } from '@/components/ui/button'

const ChartLoader = <div className="flex items-center justify-center h-[260px] text-sm text-gray-400 animate-pulse">Cargando gráfica...</div>

const CostPieChart    = dynamic(() => import('@/components/ui/kpi-charts').then(m => ({ default: m.CostPieChart })),    { ssr: false, loading: () => ChartLoader })
const TrendAreaChart  = dynamic(() => import('@/components/ui/kpi-charts').then(m => ({ default: m.TrendAreaChart })),  { ssr: false, loading: () => ChartLoader })
const EtaBarChart     = dynamic(() => import('@/components/ui/kpi-charts').then(m => ({ default: m.EtaBarChart })),     { ssr: false, loading: () => ChartLoader })
const ItemCostBarChart  = dynamic(() => import('@/components/ui/kpi-charts').then(m => ({ default: m.ItemCostBarChart })),  { ssr: false, loading: () => ChartLoader })
const ItemTimeBarChart  = dynamic(() => import('@/components/ui/kpi-charts').then(m => ({ default: m.ItemTimeBarChart })),  { ssr: false, loading: () => ChartLoader })
const EnvioCostBarChart = dynamic(() => import('@/components/ui/kpi-charts').then(m => ({ default: m.EnvioCostBarChart })), { ssr: false, loading: () => ChartLoader })
const EnvioTimeBarChart = dynamic(() => import('@/components/ui/kpi-charts').then(m => ({ default: m.EnvioTimeBarChart })), { ssr: false, loading: () => ChartLoader })

const estadoColors: Record<string, any> = {
  'Depósito Origen': 'secondary', 'Puerto Origen': 'default', 'En tránsito': 'warning',
  'Puerto Destino': 'default', 'Zona Primaria LR': 'orange', 'Depósito Fiscal': 'success',
}
const docColors: Record<string, any> = {
  'Pendiente': 'secondary', 'En Preparación': 'default', 'En Revisión': 'warning',
  'Observado': 'danger', 'Corregido': 'orange', 'Aprobado': 'success',
  'Presentado': 'default', 'Finalizado': 'success',
}

function pct(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [totales, setTotales] = useState<any[]>([])
  const [kpisData, setKpisData] = useState<any>(null)
  const [tab, setTab] = useState<'items' | 'envios' | 'kpis'>('kpis')
  const [kpiSub, setKpiSub] = useState<'general' | 'por_item' | 'por_envio'>('general')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [downloading, setDownloading] = useState(false)

  async function downloadBackup() {
    setDownloading(true)
    try {
      const res = await fetch('/api/backup')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comex-backup-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  function buildQS() {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    const qs = p.toString()
    return qs ? `?${qs}` : ''
  }

  function load() {
    const qs = buildQS()
    Promise.all([
      fetch(`/api/dashboard${qs}`).then(r => r.json()),
      fetch(`/api/totales${qs}`).then(r => r.json()),
      fetch(`/api/kpis${qs}`).then(r => r.json()),
    ]).then(([d, t, k]) => { setData(d); setTotales(t); setKpisData(k) })
  }

  useEffect(() => { load() }, [desde, hasta])

  if (!data) return (
    <div className="flex h-full items-center justify-center">
      <p className="text-gray-400">Cargando...</p>
    </div>
  )

  const { kpis, alertas, estadosEnvios, estadosDocs, ultimosEnvios } = data
  const totalAlertas = alertas.docs_observados + alertas.despachos_observados + alertas.canal_rojo
  const grandTotal = totales.reduce((a: any, t: any) => a + (t.total_operacion_usd || 0), 0)

  const costPieData = kpisData ? [
    { name: 'Mercadería',    value: kpisData.financiero.total_mercaderia },
    { name: 'Comisión SF',   value: kpisData.financiero.total_comision_sf },
    { name: 'GI (tributos)', value: kpisData.financiero.total_gi },
    { name: 'Logística',     value: kpisData.financiero.total_log },
    { name: 'Otros gastos',  value: kpisData.financiero.total_otros },
    { name: 'Honorarios',    value: kpisData.financiero.total_honorarios },
  ] : []

  return (
    <div>
      <Topbar title="Dashboard" actions={
        <div className="flex items-center gap-3">
          <DateRangeFilter desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} onClear={() => { setDesde(''); setHasta('') }} />
          <Button variant="outline" size="sm" onClick={downloadBackup} disabled={downloading}>
            <Download size={15} />
            {downloading ? 'Exportando...' : 'Backup Excel'}
          </Button>
        </div>
      } />
      <div className="p-6 space-y-6">

        {/* KPIs de conteo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="p-3 bg-[#F5EEEE] rounded-xl"><Ship className="text-[#6B1A1A]" size={22} /></div>
              <div>
                <p className="text-sm text-gray-500">Envíos</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.totalEnvios}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="p-3 bg-[#F5EEEE] rounded-xl"><Package className="text-[#6B1A1A]" size={22} /></div>
              <div>
                <p className="text-sm text-gray-500">Ítems</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.totalItems}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="p-3 bg-green-50 rounded-xl"><Landmark className="text-green-600" size={22} /></div>
              <div>
                <p className="text-sm text-gray-500">Despachos</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.totalDespachos}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        {totalAlertas > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle size={18} />Alertas activas ({totalAlertas})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {alertas.docs_observados > 0 && <AlertCard label="Docs. Observados" value={alertas.docs_observados} color="danger" />}
                {alertas.despachos_observados > 0 && <AlertCard label="Despachos Obs." value={alertas.despachos_observados} color="danger" />}
                {alertas.canal_rojo > 0 && <AlertCard label="Canal Rojo" value={alertas.canal_rojo} color="danger" />}
                {alertas.en_transito > 0 && <AlertCard label="En Tránsito" value={alertas.en_transito} color="warning" />}
                {alertas.proximos_eta > 0 && <AlertCard label="ETA próximos 7d" value={alertas.proximos_eta} color="orange" />}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div>
          <div className="flex gap-1 border-b border-gray-200 mb-4">
            {([
              { key: 'kpis', label: 'KPIs' },
              { key: 'items', label: 'Vista por Ítem' },
              { key: 'envios', label: 'Vista por Envío' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-[#6B1A1A] text-[#6B1A1A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── KPIs tab ────────────────────────────────────────────────────── */}
          {tab === 'kpis' && kpisData && (
            <div className="space-y-4">
              {/* Sub-nav */}
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { key: 'general',   label: 'General',   icon: <BarChart2 size={13} /> },
                  { key: 'por_item',  label: 'Por Ítem',  icon: <Package size={13} /> },
                  { key: 'por_envio', label: 'Por Envío', icon: <Ship size={13} /> },
                ] as const).map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setKpiSub(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      kpiSub === key
                        ? 'bg-[#6B1A1A] text-white'
                        : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {icon}{label}
                  </button>
                ))}
              </div>

              {/* ── General ── */}
              {kpiSub === 'general' && (
                <div className="space-y-6">

                  {/* Financiero KPI cards */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><DollarSign size={13} />Financiero</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      <KpiCard label="Total Cartera" value={fmtUSD(kpisData.financiero.total_cartera)} sub={`${kpisData.financiero.items_con_costo} ítem${kpisData.financiero.items_con_costo !== 1 ? 's' : ''} con costo`} icon={<DollarSign size={18} />} color="bordeaux" highlight />
                      <KpiCard label="Promedio por Ítem" value={fmtUSD(kpisData.financiero.promedio_por_item)} sub="sobre ítems con costo" icon={<BarChart2 size={18} />} color="purple" />
                      <KpiCard label="Mercadería + SF" value={fmtUSD(kpisData.financiero.total_sf)} sub={`${pct(kpisData.financiero.total_sf, kpisData.financiero.total_cartera)}% del total`} icon={<Package size={18} />} color="indigo" />
                      <KpiCard label="Gastos Importación" value={fmtUSD(kpisData.financiero.total_gi)} sub={`${pct(kpisData.financiero.total_gi, kpisData.financiero.total_cartera)}% del total`} icon={<Landmark size={18} />} color="amber" />
                      <KpiCard label="Gastos Logísticos" value={fmtUSD(kpisData.financiero.total_log)} sub={`${pct(kpisData.financiero.total_log, kpisData.financiero.total_cartera)}% del total`} icon={<TruckIcon size={18} />} color="green" />
                      <KpiCard label="Otros Gastos" value={fmtUSD(kpisData.financiero.total_otros)} sub={`${pct(kpisData.financiero.total_otros, kpisData.financiero.total_cartera)}% del total`} icon={<BarChart2 size={18} />} color="teal" />
                      <KpiCard label="Honorarios Despacho" value={fmtUSD(kpisData.financiero.total_honorarios)} sub={`${pct(kpisData.financiero.total_honorarios, kpisData.financiero.total_cartera)}% del total`} icon={<Landmark size={18} />} color="rose" />
                    </div>
                  </div>

                  {/* Charts row: Donut + Tendencia mensual */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader><CardTitle className="text-sm text-gray-600">Composición del costo</CardTitle></CardHeader>
                      <CardContent className="pt-0">
                        <CostPieChart data={costPieData} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-sm text-gray-600">Tendencia mensual — últimos 6 meses</CardTitle></CardHeader>
                      <CardContent className="pt-0">
                        <TrendAreaChart data={kpisData.tendencia_mensual ?? []} />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tiempos KPI cards */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Timer size={13} />Tiempos</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      <KpiCard label="Días en Tránsito" value={kpisData.tiempos.transito_dias_avg != null ? `${kpisData.tiempos.transito_dias_avg}d` : '—'} sub="salida → llegada puerto" icon={<Ship size={18} />} color="blue" />
                      <KpiCard label="Días en Aduana" value={kpisData.tiempos.aduana_dias_avg != null ? `${kpisData.tiempos.aduana_dias_avg}d` : '—'} sub="oficialización → liberación" icon={<Landmark size={18} />} color="amber" />
                      <KpiCard label="Ciclo Total" value={kpisData.tiempos.ciclo_dias_avg != null ? `${kpisData.tiempos.ciclo_dias_avg}d` : '—'} sub="carga → liberación" icon={<Clock size={18} />} color="purple" />
                      <KpiCard label="Ítems Retrasados" value={kpisData.tiempos.items_retrasados} sub="ETA vencida, sin liberar" icon={<AlertCircle size={18} />} color={kpisData.tiempos.items_retrasados > 0 ? 'red' : 'green'} />
                      <KpiCard label="Liberados este Mes" value={kpisData.tiempos.liberados_mes} sub={`${kpisData.tiempos.liberados_mes_anterior} el mes anterior`} icon={<CheckCircle2 size={18} />} color="green" />
                    </div>
                  </div>

                  {/* ETAs próximos — BarChart */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm text-gray-600 flex items-center gap-2"><Clock size={14} />ETAs próximos 30 días</CardTitle></CardHeader>
                    <CardContent className="pt-0">
                      <EtaBarChart data={kpisData.tiempos.proximos_eta ?? []} />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── Por Ítem ── */}
              {kpiSub === 'por_item' && (
                <div className="space-y-4">

                  <Card>
                    <CardHeader><CardTitle className="text-sm text-gray-600">Ranking de ítems por costo total (top 10)</CardTitle></CardHeader>
                    <CardContent className="pt-0">
                      <ItemCostBarChart data={kpisData.por_item} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-sm text-gray-600">Tiempos por Ítem (días)</CardTitle></CardHeader>
                    <CardContent className="pt-0">
                      <ItemTimeBarChart data={kpisData.por_item} />
                    </CardContent>
                  </Card>

                  {/* Table */}
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Package size={16} />Detalle — financiero y tiempos por ítem</CardTitle></CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th colSpan={5} className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">Identificación</th>
                            <th colSpan={5} className="px-3 py-2 text-left text-xs font-semibold text-indigo-400 uppercase tracking-wider bg-indigo-50/40 border-l border-gray-100">Financiero (USD)</th>
                            <th colSpan={3} className="px-3 py-2 text-left text-xs font-semibold text-amber-600 uppercase tracking-wider bg-amber-50/40 border-l border-gray-100">Tiempos (días)</th>
                          </tr>
                          <tr className="border-b border-gray-100">
                            {['ID Ítem','Detalle','Envío','Estado','ETA'].map(h => (
                              <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50/60">{h}</th>
                            ))}
                            {['Mercad.','SF','GI','Log.','Total'].map(h => (
                              <th key={h} className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-indigo-50/20 border-l border-gray-100">{h}</th>
                            ))}
                            {['Tránsito','Aduana','Ciclo'].map(h => (
                              <th key={h} className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-amber-50/20 border-l border-gray-100">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {kpisData.por_item.length === 0 && (
                            <tr><td colSpan={13} className="text-center py-10 text-gray-400">Sin ítems</td></tr>
                          )}
                          {kpisData.por_item.map((r: any) => (
                            <tr key={r.id_item} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-3 py-2.5 font-medium text-[#6B1A1A] whitespace-nowrap">{r.id_item}</td>
                              <td className="px-3 py-2.5 max-w-[110px] truncate text-gray-700">{r.detalle ?? '—'}</td>
                              <td className="px-3 py-2.5 text-[#6B1A1A] whitespace-nowrap">{r.id_envio ?? '—'}</td>
                              <td className="px-3 py-2.5"><Badge variant={estadoColors[r.estado] ?? 'secondary'} className="text-xs whitespace-nowrap">{r.estado ?? '—'}</Badge></td>
                              <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{r.eta ?? '—'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700 border-l border-gray-100">{r.mercaderia_usd > 0 ? fmtUSD(r.mercaderia_usd) : '—'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700">{r.comision_sf_usd > 0 ? fmtUSD(r.comision_sf_usd) : '—'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700">{r.gi_usd > 0 ? fmtUSD(r.gi_usd) : '—'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700">{r.log_usd > 0 ? fmtUSD(r.log_usd) : '—'}</td>
                              <td className="px-3 py-2.5 text-right font-bold text-gray-900">{r.total_usd > 0 ? fmtUSD(r.total_usd) : '—'}</td>
                              <td className="px-3 py-2.5 text-center text-gray-600 border-l border-gray-100">{r.dias_transito != null ? `${r.dias_transito}d` : '—'}</td>
                              <td className="px-3 py-2.5 text-center text-gray-600">{r.dias_aduana != null ? `${r.dias_aduana}d` : '—'}</td>
                              <td className="px-3 py-2.5 text-center text-gray-600">{r.dias_ciclo != null ? `${r.dias_ciclo}d` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* ── Por Envío ── */}
              {kpiSub === 'por_envio' && (
                <div className="space-y-4">

                  <Card>
                    <CardHeader><CardTitle className="text-sm text-gray-600">Costo por Envío (USD)</CardTitle></CardHeader>
                    <CardContent className="pt-0">
                      <EnvioCostBarChart data={kpisData.por_envio} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-sm text-gray-600">Tiempos por Envío (días)</CardTitle></CardHeader>
                    <CardContent className="pt-0">
                      <EnvioTimeBarChart data={kpisData.por_envio} />
                    </CardContent>
                  </Card>

                  {/* Table */}
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Ship size={16} />Detalle — financiero y tiempos por envío</CardTitle></CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th colSpan={5} className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">Identificación</th>
                            <th colSpan={4} className="px-3 py-2 text-left text-xs font-semibold text-indigo-400 uppercase tracking-wider bg-indigo-50/40 border-l border-gray-100">Financiero (USD)</th>
                            <th colSpan={3} className="px-3 py-2 text-left text-xs font-semibold text-amber-600 uppercase tracking-wider bg-amber-50/40 border-l border-gray-100">Tiempos (días)</th>
                          </tr>
                          <tr className="border-b border-gray-100">
                            {['ID Envío','Origen → Destino','Transporte','ETD','ETA / Ítems'].map(h => (
                              <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50/60">{h}</th>
                            ))}
                            {['SF','GI','Log.','Total'].map(h => (
                              <th key={h} className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-indigo-50/20 border-l border-gray-100">{h}</th>
                            ))}
                            {['Tránsito','Aduana avg','Ciclo'].map(h => (
                              <th key={h} className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-amber-50/20 border-l border-gray-100">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {kpisData.por_envio.length === 0 && (
                            <tr><td colSpan={12} className="text-center py-10 text-gray-400">Sin envíos activos</td></tr>
                          )}
                          {kpisData.por_envio.map((r: any) => (
                            <tr key={r.id_envio} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-3 py-2.5 font-medium text-[#6B1A1A] whitespace-nowrap">{r.id_envio}</td>
                              <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{r.origen ?? '—'} → {r.destino ?? '—'}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{r.tipo_transporte ?? '—'}</td>
                              <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{r.etd ?? '—'}</td>
                              <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{r.eta ?? '—'} <span className="text-gray-400">({r.total_items} ítem{r.total_items !== 1 ? 's' : ''})</span></td>
                              <td className="px-3 py-2.5 text-right text-gray-700 border-l border-gray-100">{r.total_sf_usd > 0 ? fmtUSD(r.total_sf_usd) : '—'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700">{r.total_gi_usd > 0 ? fmtUSD(r.total_gi_usd) : '—'}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700">{r.total_log_usd > 0 ? fmtUSD(r.total_log_usd) : '—'}</td>
                              <td className="px-3 py-2.5 text-right font-bold text-gray-900">{r.total_usd > 0 ? fmtUSD(r.total_usd) : '—'}</td>
                              <td className="px-3 py-2.5 text-center text-gray-600 border-l border-gray-100">{r.dias_transito != null ? `${r.dias_transito}d` : '—'}</td>
                              <td className="px-3 py-2.5 text-center text-gray-600">{r.dias_aduana_avg != null ? `${r.dias_aduana_avg}d` : '—'}</td>
                              <td className="px-3 py-2.5 text-center text-gray-600">{r.dias_ciclo != null ? `${r.dias_ciclo}d` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

            </div>
          )}

          {/* ── Items tab ───────────────────────────────────────────────────── */}
          {tab === 'items' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Package size={16} />Resumen por Ítem</CardTitle>
                  {grandTotal > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total operación</p>
                      <p className="text-lg font-bold text-[#6B1A1A]">{fmtUSD(grandTotal)}</p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['ID Ítem', 'Detalle', 'Envío', 'Estado', 'Doc.', 'ETA', 'Total SF', 'GI', 'Logístico', 'Total Operación'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {totales.length === 0 && (
                      <tr><td colSpan={10} className="text-center py-10 text-gray-400">Sin datos de ítems</td></tr>
                    )}
                    {totales.map((r: any) => (
                      <tr key={r.id_item} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-[#6B1A1A]">{r.id_item}</td>
                        <td className="px-4 py-3 max-w-[120px] truncate">{r.detalle ?? '-'}</td>
                        <td className="px-4 py-3 text-[#6B1A1A]">{r.id_envio ?? '-'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={estadoColors[r.estado] ?? 'secondary'} className="text-xs">{r.estado ?? '-'}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={docColors[r.estado_documentacion] ?? 'secondary'} className="text-xs">{r.estado_documentacion ?? '-'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{r.envio_eta ?? '-'}</td>
                        <td className="px-4 py-3 text-right">{fmtUSD(r.total_sf_usd)}</td>
                        <td className="px-4 py-3 text-right">{fmtUSD(r.total_gi)}</td>
                        <td className="px-4 py-3 text-right">{fmtUSD(r.gasto_log)}</td>
                        <td className="px-4 py-3 text-right font-bold">{fmtUSD(r.total_operacion_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── Envíos tab ──────────────────────────────────────────────────── */}
          {tab === 'envios' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><TruckIcon size={16} />Estado de Ítems</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {estadosEnvios.length === 0 && <p className="text-sm text-gray-400">Sin datos</p>}
                    {estadosEnvios.map((e: any) => (
                      <div key={e.estado} className="flex items-center justify-between">
                        <Badge variant={estadoColors[e.estado] ?? 'secondary'}>{e.estado}</Badge>
                        <span className="text-sm font-semibold text-gray-700">{e.total}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Package size={16} />Estado Documentación</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {estadosDocs.length === 0 && <p className="text-sm text-gray-400">Sin datos</p>}
                    {estadosDocs.map((e: any) => (
                      <div key={e.estado} className="flex items-center justify-between">
                        <Badge variant={docColors[e.estado] ?? 'secondary'}>{e.estado}</Badge>
                        <span className="text-sm font-semibold text-gray-700">{e.total}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Clock size={16} />Últimos Envíos</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ultimosEnvios.length === 0 && <p className="text-sm text-gray-400">Sin envíos</p>}
                    {ultimosEnvios.map((e: any) => (
                      <div key={e.id_envio} className="flex items-start justify-between border-b border-gray-100 pb-2 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{e.id_envio}</p>
                          <p className="text-xs text-gray-500">{e.origen} → {e.destino}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{e.items} ítem{e.items !== 1 ? 's' : ''}</p>
                          {e.eta && <p className="text-xs text-[#6B1A1A]">ETA: {e.eta}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
  bordeaux: { bg: 'bg-[#F5EEEE]', text: 'text-[#4A1010]',   icon: 'text-[#6B1A1A]' },
  blue:     { bg: 'bg-blue-50',   text: 'text-blue-700',    icon: 'text-blue-600' },
  purple:   { bg: 'bg-purple-50', text: 'text-purple-700',  icon: 'text-purple-600' },
  indigo:   { bg: 'bg-indigo-50', text: 'text-indigo-700',  icon: 'text-indigo-600' },
  amber:    { bg: 'bg-amber-50',  text: 'text-amber-700',   icon: 'text-amber-600' },
  green:    { bg: 'bg-green-50',  text: 'text-green-700',   icon: 'text-green-600' },
  teal:     { bg: 'bg-teal-50',   text: 'text-teal-700',    icon: 'text-teal-600' },
  rose:     { bg: 'bg-rose-50',   text: 'text-rose-700',    icon: 'text-rose-600' },
  red:      { bg: 'bg-red-50',    text: 'text-red-700',     icon: 'text-red-600' },
}

function KpiCard({
  label, value, sub, icon, color, highlight,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ReactNode; color: string; highlight?: boolean
}) {
  const c = colorMap[color] ?? colorMap.bordeaux
  return (
    <Card className={highlight ? 'ring-2 ring-red-200' : ''}>
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <div className={`p-1.5 rounded-lg ${c.bg}`}>
            <span className={c.icon}>{icon}</span>
          </div>
        </div>
        <p className={`text-xl font-bold ${c.text}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function AlertCard({ label, value, color }: { label: string; value: number; color: any }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-orange-100 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <Badge variant={color} className="mt-1 text-xs">{label}</Badge>
    </div>
  )
}
