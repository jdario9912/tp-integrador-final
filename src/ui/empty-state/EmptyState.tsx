import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { IconChip } from '../icon-chip'

export type EmptyStateProps = Omit<ComponentPropsWithoutRef<'div'>, 'title'> & {
  icon: ReactNode
  title: string
  description?: ReactNode
  // botón o link para salir del estado vacío
  action?: ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 py-16 text-center',
        className,
      )}
      {...rest}
    >
      <IconChip tone="neutral" size="xl">
        {icon}
      </IconChip>
      <h3 className="text-xl font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground max-w-md text-[15px]">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
