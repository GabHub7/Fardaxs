import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-[hsl(var(--background-muted))] text-[hsl(var(--foreground-muted))] px-2.5 py-1',
        success: 'bg-green-500/12 text-green-400 px-2.5 py-1',
        warning: 'bg-yellow-500/12 text-yellow-400 px-2.5 py-1',
        error: 'bg-red-500/12 text-red-400 px-2.5 py-1',
        info: 'bg-blue-500/12 text-blue-400 px-2.5 py-1',
        primary: 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] px-2.5 py-1',
        orange: 'bg-orange-500/12 text-orange-400 px-2.5 py-1',
        purple: 'bg-purple-500/12 text-purple-400 px-2.5 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
