'use client'
/**
 * EstadoTimeline — visual progression of state changes with dates and day deltas
 * Used for envío estado history and item estado_documentacion history.
 */

import { Badge } from '@/components/ui/badge'

export interface TimelineEntry {
  estado: string
  fecha: string          // YYYY-MM-DD
  usuario?: string | null
  motivo?: string | null
  isCurrent?: boolean
}

interface Props {
  entries: TimelineEntry[]
  variantMap: Record<string, string>
  emptyText?: string
}

function parseDateLocal(s: string): Date {
  // Parse YYYY-MM-DD as local date (avoid UTC offset issues)
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((parseDateLocal(b).getTime() - parseDateLocal(a).getTime()) / msPerDay)
}

function fmtShort(s: string): string {
  if (!s) return '—'
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y.slice(-2)}`
}

const DOT_COLORS: Record<string, string> = {
  secondary: 'bg-slate-400',
  default:   'bg-blue-500',
  blue:      'bg-sky-500',
  indigo:    'bg-indigo-500',
  warning:   'bg-amber-500',
  orange:    'bg-orange-500',
  purple:    'bg-purple-500',
  teal:      'bg-teal-500',
  success:   'bg-emerald-500',
  danger:    'bg-red-500',
}

export function EstadoTimeline({ entries, variantMap, emptyText = 'Sin cambios registrados' }: Props) {
  if (!entries.length) {
    return <p className="text-sm text-gray-400 text-center py-6">{emptyText}</p>
  }

  return (
    <div className="relative">
      {entries.map((entry, i) => {
        const prev = entries[i - 1]
        const dias = prev ? daysBetween(prev.fecha, entry.fecha) : null
        const vt = variantMap[entry.estado] ?? 'secondary'
        const dotColor = DOT_COLORS[vt] ?? 'bg-gray-400'
        const isLast = i === entries.length - 1

        return (
          <div key={i} className="flex gap-3">
            {/* Timeline spine */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ring-2 ring-white shadow-sm ${dotColor} ${entry.isCurrent ? 'ring-[#6B1A1A] w-3.5 h-3.5' : ''}`} />
              {!isLast && <div className="w-px flex-1 bg-gray-200 my-1 min-h-[28px]" />}
            </div>

            {/* Content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={vt as any} className="text-xs">
                    {entry.estado}
                    {entry.isCurrent && <span className="ml-1 opacity-60 text-[10px]">actual</span>}
                  </Badge>
                  {entry.motivo && (
                    <span className="text-xs text-gray-400 italic">"{entry.motivo}"</span>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-700">{fmtShort(entry.fecha)}</span>
                  {entry.usuario && (
                    <p className="text-[10px] text-gray-400">{entry.usuario}</p>
                  )}
                </div>
              </div>

              {/* Days delta */}
              {dias !== null && (
                <div className="mt-1 flex items-center gap-1">
                  <div className="h-px w-3 bg-gray-200" />
                  <span className={`text-[10px] font-medium ${dias === 0 ? 'text-gray-400' : dias <= 3 ? 'text-emerald-600' : dias <= 7 ? 'text-amber-600' : 'text-red-500'}`}>
                    {dias === 0 ? 'mismo día' : `+${dias} día${dias !== 1 ? 's' : ''}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
