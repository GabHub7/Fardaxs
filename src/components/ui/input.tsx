import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'w-full min-h-[44px] px-3.5 py-2.5',
            'bg-[hsl(var(--background-muted))] border border-[hsl(var(--border))]',
            'rounded-[14px] text-sm text-[hsl(var(--foreground))]',
            'placeholder:text-[hsl(var(--foreground-muted))]',
            'transition-all duration-150 outline-none',
            'focus:border-[hsl(var(--primary))] focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500/70 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
