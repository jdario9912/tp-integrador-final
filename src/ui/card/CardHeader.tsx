import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type CardHeaderProps = Omit<ComponentPropsWithoutRef<'div'>, 'title'> & {
  title: ReactNode
  // icono antes del título
  icon?: ReactNode
  // link, chip o control a la derecha
  action?: ReactNode
}

export function CardHeader({
  title,
  icon,
  action,
  className,
  ...rest
}: CardHeaderProps) {
  return (
    <div
      className={cn('mb-5 flex items-center justify-between gap-3', className)}
      {...rest}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span aria-hidden="true" className="text-primary flex [&_svg]:size-5">
            {icon}
          </span>
        )}
        <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      </div>
      {action}
    </div>
  )
}
