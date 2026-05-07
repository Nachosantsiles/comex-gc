'use client'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import { fmtUSD } from '@/lib/utils'

const PIE_COLORS = ['#4f46e5', '#7c3aed', '#d97706', '#16a34a', '#0d9488', '#e11d48']

function fmt(v: any) { return fmtUSD(Number(v)) }

/* ── Donut — composición del costo ──────────────────────────────────────── */
export function CostPieChart({ data }: { data: { name: string; value: number }[] }) {
  const withData = data.filter(d => d.value > 0)
  if (!withData.length) return (
    <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">Sin costos registrados</div>
  )
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={withData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={2}>
          {withData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />)}
        </Pie>
        <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

/* ── Area chart — tendencia mensual ─────────────────────────────────────── */
export function TrendAreaChart({ data }: { data: { mes: string; total_sf: number; total_gi: number }[] }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">Sin datos de tendencia</div>
  )
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="sfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="giGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={48} />
        <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="total_sf" name="Mercad. + SF" stackId="1" stroke="#4f46e5" fill="url(#sfGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="total_gi" name="GI (tributos)" stackId="1" stroke="#d97706" fill="url(#giGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Bar chart — ETAs próximos 30 días ──────────────────────────────────── */
export function EtaBarChart({ data }: { data: { bucket: string; total: number }[] }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-[160px] text-sm text-gray-400">Sin ETAs en los próximos 30 días</div>
  )
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barSize={52} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="bucket" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
        <Tooltip formatter={(v: any) => [`${v} ítem${v !== 1 ? 's' : ''}`, 'Cantidad']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        <Bar dataKey="total" name="Ítems" fill="#6B1A1A" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Horizontal stacked bar — ranking ítems por costo ───────────────────── */
export function ItemCostBarChart({ data }: { data: any[] }) {
  const sorted = [...data].sort((a, b) => b.total_usd - a.total_usd).slice(0, 10)
  if (!sorted.length) return (
    <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">Sin ítems con costos registrados</div>
  )
  const height = Math.min(sorted.length * 44 + 30, 480)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={sorted} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="id_item" tick={{ fontSize: 11 }} width={72} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: any, name: any) => [fmt(v), name]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="mercaderia_usd" name="Mercad." stackId="a" fill="#4f46e5" />
        <Bar dataKey="comision_sf_usd" name="Comis. SF" stackId="a" fill="#7c3aed" />
        <Bar dataKey="gi_usd" name="GI" stackId="a" fill="#d97706" />
        <Bar dataKey="log_usd" name="Log." stackId="a" fill="#16a34a" />
        <Bar dataKey="honorarios_usd" name="Honor." stackId="a" fill="#e11d48" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Horizontal bar — tiempos por ítem ──────────────────────────────────── */
export function ItemTimeBarChart({ data }: { data: any[] }) {
  const withTime = data.filter(r => r.dias_ciclo != null || r.dias_aduana != null).slice(0, 10)
  if (!withTime.length) return (
    <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">Sin datos de tiempos por ítem</div>
  )
  const height = Math.min(withTime.length * 44 + 30, 480)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={withTime} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} unit="d" axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="id_item" tick={{ fontSize: 11 }} width={72} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: any, name: any) => [`${v} días`, name]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="dias_transito" name="Tránsito" fill="#3b82f6" radius={[0, 2, 2, 0]} />
        <Bar dataKey="dias_aduana" name="Aduana" fill="#f59e0b" radius={[0, 2, 2, 0]} />
        <Bar dataKey="dias_ciclo" name="Ciclo total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Horizontal stacked bar — costo por envío ───────────────────────────── */
export function EnvioCostBarChart({ data }: { data: any[] }) {
  const sorted = [...data].sort((a, b) => b.total_usd - a.total_usd)
  if (!sorted.length) return (
    <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">Sin envíos con costos registrados</div>
  )
  const height = Math.min(sorted.length * 44 + 30, 400)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={sorted} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="id_envio" tick={{ fontSize: 11 }} width={72} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: any, name: any) => [fmt(v), name]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="total_sf_usd" name="Mercad. + SF" stackId="a" fill="#4f46e5" />
        <Bar dataKey="total_gi_usd" name="GI (tributos)" stackId="a" fill="#d97706" />
        <Bar dataKey="total_log_usd" name="Logística" stackId="a" fill="#16a34a" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Horizontal grouped bar — tiempos por envío ─────────────────────────── */
export function EnvioTimeBarChart({ data }: { data: any[] }) {
  const withTime = data.filter(r => r.dias_transito != null || r.dias_aduana_avg != null || r.dias_ciclo != null)
  if (!withTime.length) return (
    <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">Sin datos de tiempos por envío</div>
  )
  const height = Math.min(withTime.length * 56 + 30, 420)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={withTime} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} unit="d" axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="id_envio" tick={{ fontSize: 11 }} width={72} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: any, name: any) => [`${v} días`, name]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="dias_transito" name="Tránsito" fill="#3b82f6" radius={[0, 2, 2, 0]} />
        <Bar dataKey="dias_aduana_avg" name="Aduana avg" fill="#f59e0b" radius={[0, 2, 2, 0]} />
        <Bar dataKey="dias_ciclo" name="Ciclo total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
