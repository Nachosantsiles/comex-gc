import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  badge?: { label: string; variant: 'alert' | 'ok' | 'warn' | 'neutral' }
}

const badgeStyles = {
  alert:   'bg-red-100 text-red-700 border border-red-200',
  ok:      'bg-emerald-100 text-emerald-700 border border-emerald-200',
  warn:    'bg-amber-100 text-amber-700 border border-amber-200',
  neutral: 'bg-stone-100 text-stone-600 border border-stone-200',
}

export function PageHeader({ title, subtitle, actions, badge }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-7">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{title}</h1>
          {badge && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeStyles[badge.variant]}`}>
              {badge.label}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-stone-500">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  )
}

/* Botón primario estandarizado para abastecimiento */
export function PrimaryBtn({
  children, onClick, icon: Icon,
}: {
  children: React.ReactNode
  onClick?: () => void
  icon?: React.ElementType
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all active:scale-[.98]"
      style={{ background: 'linear-gradient(135deg, #8B6914, #6b5010)', boxShadow: '0 2px 8px rgba(139,105,20,0.35)' }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  )
}

/* Botón secundario */
export function SecondaryBtn({
  children, onClick, icon: Icon,
}: {
  children: React.ReactNode
  onClick?: () => void
  icon?: React.ElementType
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-all active:scale-[.98]"
    >
      {Icon && <Icon size={15} className="text-stone-500" />}
      {children}
    </button>
  )
}
