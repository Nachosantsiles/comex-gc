import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-600 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400',
          'shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
          'transition-shadow duration-150',
          error
            ? 'border-red-300 focus:border-[#9B2828] focus:outline-none focus:ring-2 focus:ring-red-500/20'
            : 'border-slate-200 focus:border-[#9B2828] focus:outline-none focus:ring-2 focus:ring-[#6B1A1A]/20',
          'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
