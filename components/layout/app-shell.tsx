'use client'
import { usePathname } from 'next/navigation'

const ABAST_ROUTES = [
  '/abastecimiento-dashboard', '/compras', '/proveedores', '/insumos',
  '/stock', '/destinaciones', '/polizas', '/kpis', '/plan',
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const inAbast = ABAST_ROUTES.some(r => pathname.startsWith(r))

  return (
    <main
      className="flex-1 ml-56 overflow-y-auto transition-colors duration-300"
      style={{ background: inAbast ? '#faf8f2' : '#deebd4' }}
    >
      <div className="px-8 py-7">
        {children}
      </div>
    </main>
  )
}
