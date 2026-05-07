import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[] | string[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, placeholder, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-600 uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900',
          'shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
          'transition-shadow duration-150 appearance-none cursor-pointer',
          error
            ? 'border-red-300 focus:border-[#9B2828] focus:outline-none focus:ring-2 focus:ring-red-500/20'
            : 'border-slate-200 focus:border-[#9B2828] focus:outline-none focus:ring-2 focus:ring-[#6B1A1A]/20',
          'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
          className
        )}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value
          const lbl = typeof opt === 'string' ? opt : opt.label
          return <option key={val} value={val}>{lbl}</option>
        })}
      </select>
      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'
