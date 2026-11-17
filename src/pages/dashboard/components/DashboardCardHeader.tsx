import type { ReactNode } from 'react'

type DashboardCardHeaderProps = {
  id: string
  title: string
  icon: ReactNode
  // link a la sección completa, a la derecha del título
  action?: ReactNode
}

// encabezado de cada tarjeta del panel. El título es el nombre accesible de la tarjeta (aria-labelledby)
export function DashboardCardHeader({
  id,
  title,
  icon,
  action,
}: DashboardCardHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden="true" className="text-primary flex [&_svg]:size-5">
          {icon}
        </span>
        <h2 id={id} className="text-lg font-semibold sm:text-xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}
