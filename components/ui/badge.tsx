import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap',
  {
    variants: {
      variant: {
        default:   'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/70',
        success:   'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70',
        warning:   'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70',
        danger:    'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/70',
        orange:    'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200/70',
        secondary: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/70',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export function Badge({
  className, variant, ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
