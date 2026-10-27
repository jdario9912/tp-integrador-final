import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type InfoTileProps = ComponentPropsWithoutRef<'div'> & {
  label: string
  value: ReactNode
  icon?: ReactNode
}

// dato chico dentro de una card (Objetivo, Peso)
export function InfoTile({
  label,
  value,
  icon,
  className,
  ...rest
}: InfoTileProps) {
  return (
    <div
      className={cn('bg-muted flex flex-col gap-1 rounded-lg p-3', className)}
      {...rest}
    >
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold [&_svg]:size-4">
        {icon && (
          <span aria-hidden="true" className="flex">
            {icon}
          </span>
        )}
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}
