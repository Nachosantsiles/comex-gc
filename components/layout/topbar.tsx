'use client'
import { useSession } from 'next-auth/react'

interface TopbarProps {
  title: string
  actions?: React.ReactNode
}

export function Topbar({ title, actions }: TopbarProps) {
  const { data: session } = useSession()
  const user = session?.user as any
  const initial = user?.name?.[0]?.toUpperCase() ?? 'U'

  return (
    <header className="sticky top-0 z-30 bg-white" style={{ boxShadow: '0 1px 0 #e2e8f0', borderTop: '3px solid #6B1A1A' }}>
      <div className="h-13 flex items-center justify-between px-6 py-3">
        <h1 className="text-base font-bold text-slate-800 tracking-tight">{title}</h1>
        <div className="flex items-center gap-3">
          {actions && (
            <>
              {actions}
              <div className="w-px h-5 bg-slate-200" />
            </>
          )}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #9B2828, #6B1A1A)', boxShadow: '0 2px 6px rgba(107,26,26,0.35)' }}
            >
              {initial}
            </div>
            <div className="hidden sm:block leading-none">
              <p className="text-xs font-semibold text-slate-700">{user?.name ?? 'Usuario'}</p>
              <p className="text-[11px] text-slate-400 capitalize mt-0.5">{user?.role ?? ''}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
