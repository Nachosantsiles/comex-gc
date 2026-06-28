'use client'
import { useEffect, useState } from 'react'
import { hydrateData } from '@/lib/abastecimiento-store'

// Espera a que el estado de Abastecimiento se hidrate desde el servidor antes
// de renderizar la app, así loadData() ya devuelve los datos compartidos.
export function StoreHydration({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    hydrateData().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#deebd4]">
        <div className="flex items-center gap-3 text-stone-500 text-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
          Cargando datos…
        </div>
      </div>
    )
  }
  return <>{children}</>
}
