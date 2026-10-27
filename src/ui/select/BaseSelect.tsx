import { ChevronDown } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type BaseSelectProps = ComponentPropsWithoutRef<'select'>

// el chevron nativo se oculta y se dibuja uno propio encima, sin capturar clicks
export function BaseSelect({ className, children, ...rest }: BaseSelectProps) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          'h-11 w-full cursor-pointer appearance-none rounded-control border pr-10 pl-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="text-subtle-foreground pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2"
      />
    </div>
  )
}
