'use client'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: [
          'bg-[#6B1A1A] text-white shadow-sm',
          'hover:bg-[#4A1010] focus-visible:ring-[#6B1A1A]',
          'shadow-[0_1px_2px_rgba(107,26,26,0.3)]',
        ],
        secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-400',
        danger: [
          'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500',
          'shadow-[0_1px_2px_rgba(220,38,38,0.25)]',
        ],
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-slate-400',
        outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
      },
      size: {
        sm:   'px-2.5 py-1.5 text-xs rounded-md',
        md:   'px-3.5 py-2',
        lg:   'px-5 py-2.5 text-[15px]',
        icon: 'p-2',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
)
Button.displayName = 'Button'
