import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(n: number | null | undefined, decimals = 2) {
  if (n == null) return '-'
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)
}

export function fmtUSD(n: number | null | undefined) {
  if (n == null) return '-'
  return `USD ${fmt(n)}`
}

/** Format a YYYY-MM-DD (or datetime) string as dd/mm/yy */
export function fmtDate(val: string | null | undefined): string {
  if (!val) return '-'
  const s = val.slice(0, 10) // take only YYYY-MM-DD
  const [y, m, d] = s.split('-')
  if (!y || !m || !d) return val
  return `${d}/${m}/${y.slice(-2)}`
}

/** Compute the current stage of a shipment based on its date fields */
export function getEtapa(e: {
  cerrado?: number | boolean | null
  fecha_desconsolidacion?: string | null
  fecha_llegada_lr?: string | null
  fecha_llegada_puerto?: string | null
  fecha_salida?: string | null
  fecha_carga?: string | null
  etd?: string | null
} | null | undefined): { label: string; variant: string } {
  if (!e) return { label: 'Sin Envío', variant: 'secondary' }
  if (e.cerrado)                  return { label: 'Cerrado',         variant: 'secondary' }
  if (e.fecha_desconsolidacion)   return { label: 'Desconsolidado',  variant: 'success'   }
  if (e.fecha_llegada_lr)         return { label: 'En La Rioja',     variant: 'success'   }
  if (e.fecha_llegada_puerto)     return { label: 'Puerto Destino',  variant: 'purple'    }
  if (e.fecha_salida)             return { label: 'En Tránsito',     variant: 'warning'   }
  if (e.fecha_carga)              return { label: 'Cargado',         variant: 'blue'      }
  if (e.etd)                      return { label: 'ETD Confirmado',  variant: 'indigo'    }
  return                                 { label: 'Sin Iniciar',     variant: 'secondary' }
}
