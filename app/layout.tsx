import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'COMEX GC ARG',
  description: 'Sistema de comercio exterior - Grupo Cazorla Argentina',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="text-slate-900 antialiased" style={{ background: '#deebd4' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
