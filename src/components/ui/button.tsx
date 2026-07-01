'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none -webkit-tap-highlight-color-transparent',
  {
    variants: {
      variant: {
        primary:
          'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.85)] focus-visible:ring-[hsl(var(--primary))]',
        secondary:
          'bg-[hsl(var(--background-muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--border))]',
        ghost:
          'text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--background-muted))] hover:text-[hsl(var(--foreground))]',
        destructive:
          'bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30',
        success:
          'bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30',
        outline:
          'border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-muted))]',
        link: 'text-[hsl(var(--primary))] underline-offset-4 hover:underline rounded-none min-h-0 h-auto p-0',
      },
      size: {
        sm: 'h-9 px-3 text-xs rounded-[10px]',
        md: 'h-11 px-5',
        lg: 'h-12 px-7 text-base',
        xl: 'h-14 px-8 text-base',
        icon: 'h-10 w-10 rounded-full p-0',
        'icon-sm': 'h-8 w-8 rounded-full p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled ?? loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
