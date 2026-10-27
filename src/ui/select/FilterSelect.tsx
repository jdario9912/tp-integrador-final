import { ChevronDown } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type FilterSelectProps = ComponentPropsWithoutRef<'select'> & {
  // nombre del filtro, se muestra antes del valor: "Estado: Todos"
  label: string
}

// select compacto para barras de filtros; el label envuelve al select y lo nombra
export function FilterSelect({
  label,
  className,
  children,
  ...rest
}: FilterSelectProps) {
  return (
    <label
      className={cn(
        'border-border-subtle bg-surface hover:border-primary has-[select:focus-visible]:ring-ring relative inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-control border pr-9 pl-3.5 text-sm transition-colors has-[select:focus-visible]:ring-2',
        className,
      )}
    >
      <span className="text-muted-foreground font-semibold">{label}:</span>
      <select
        className="text-foreground cursor-pointer appearance-none bg-transparent font-semibold outline-none"
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="text-subtle-foreground pointer-events-none absolute top-1/2 right-3 size-4.5 -translate-y-1/2"
      />
    </label>
  )
}
