import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

type PageHeaderProps = {
  title: string
  description?: ReactNode
  // texto chico sobre el título ("Constructor de rutinas")
  eyebrow?: ReactNode
  // botones de la página, a la derecha en escritorio
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-end justify-between gap-x-6 gap-y-4',
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        {eyebrow && (
          <span className="text-primary text-xs font-bold tracking-widest uppercase">
            {eyebrow}
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <div className="text-muted-foreground text-base">{description}</div>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  )
}
