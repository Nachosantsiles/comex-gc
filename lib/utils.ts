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
