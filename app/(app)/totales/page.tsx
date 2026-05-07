'use client'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtUSD, fmt } from '@/lib/utils'

const docVariant: Record<string, any> = {
  Pendiente: 'secondary', 'En Preparación': 'default', 'En Revisión': 'warning',
  Observado: 'danger', Corregido: 'orange', Aprobado: 'success', Presentado: 'default', Finalizado: 'success',
}

export default function TotalesPage() {
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/totales').then(r => r.json()).then(setRows)
  }, [])

  const sum = (key: string) => rows.reduce((a, r) => a + (r[key] || 0), 0)
  const grandTotal = sum('total_operacion_usd')

  return (
    <div>
      <Topbar title="Total x Ítem" />
      <div className="p-6 space-y-5">

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SumCard label="Ítems" value={rows.length.toString()} />
          <SumCard label="Valor Real (USD)" value={fmtUSD(sum('valor_real_usd'))} />
          <SumCard label="Comisión SF (USD)" value={fmtUSD(sum('comision_sf_usd'))} />
          <SumCard label="Total GI (USD)" value={fmtUSD(sum('total_gi'))} />
          <SumCard label="Gastos Log. (USD)" value={fmtUSD(sum('gasto_log'))} />
          <SumCard label="Total de Operaciones" value={fmtUSD(grandTotal)} highlight />
        </div>

        <Card>
          <CardHeader><CardTitle>Resumen por Ítem</CardTitle></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    'ID Ítem', 'Detalle', 'Envío', 'Estado', 'Doc.',
                    'Valor Real', 'Comisión SF', 'Total SF', 'GI', 'Otros',
                    'Log.', 'Honorarios', 'TOTAL',
                  ].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={13} className="text-center py-12 text-gray-400">Sin datos. Completá Detalle + GI y Gastos Logísticos.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id_item} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium text-[#6B1A1A] whitespace-nowrap">{r.id_item}</td>
                    <td className="px-3 py-3 max-w-[140px] truncate">{r.detalle ?? '-'}</td>
                    <td className="px-3 py-3 text-[#6B1A1A] whitespace-nowrap">{r.id_envio ?? '-'}</td>
                    <td className="px-3 py-3">
                      <Badge variant="secondary" className="text-xs">{r.estado ?? '-'}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={docVariant[r.estado_documentacion] ?? 'secondary'} className="text-xs">{r.estado_documentacion ?? '-'}</Badge>
                    </td>
                    <td className="px-3 py-3 text-right">{fmtUSD(r.valor_real_usd)}</td>
                    <td className="px-3 py-3 text-right text-gray-500">{fmtUSD(r.comision_sf_usd)}</td>
                    <td className="px-3 py-3 text-right font-medium">{fmtUSD(r.total_sf_usd)}</td>
                    <td className="px-3 py-3 text-right">{fmtUSD(r.total_gi)}</td>
                    <td className="px-3 py-3 text-right">{fmtUSD(r.total_otros)}</td>
                    <td className="px-3 py-3 text-right">{fmtUSD(r.gasto_log)}</td>
                    <td className="px-3 py-3 text-right">{fmtUSD(r.honorarios_despacho_usd)}</td>
                    <td className="px-3 py-3 text-right font-bold text-gray-900">{fmtUSD(r.total_operacion_usd)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan={5} className="px-3 py-3 font-semibold text-gray-700">TOTALES</td>
                    <td className="px-3 py-3 text-right font-semibold">{fmtUSD(sum('valor_real_usd'))}</td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-500">{fmtUSD(sum('comision_sf_usd'))}</td>
                    <td className="px-3 py-3 text-right font-semibold">{fmtUSD(sum('total_sf_usd'))}</td>
                    <td className="px-3 py-3 text-right font-semibold">{fmtUSD(sum('total_gi'))}</td>
                    <td className="px-3 py-3 text-right font-semibold">{fmtUSD(sum('total_otros'))}</td>
                    <td className="px-3 py-3 text-right font-semibold">{fmtUSD(sum('gasto_log'))}</td>
                    <td className="px-3 py-3 text-right font-semibold">{fmtUSD(sum('honorarios_despacho_usd'))}</td>
                    <td className="px-3 py-3 text-right font-bold text-[#4A1010] text-base">{fmtUSD(grandTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

function SumCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'bg-[#6B1A1A] border-[#6B1A1A] text-white' : 'bg-white border-gray-200'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${highlight ? 'text-red-100' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
