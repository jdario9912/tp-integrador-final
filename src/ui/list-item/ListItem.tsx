import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type ListItemProps = Omit<ComponentPropsWithoutRef<'li'>, 'title'> & {
  title: ReactNode
  // texto secundario bajo el título
  meta?: ReactNode
  // IconChip, Avatar o número de orden
  leading?: ReactNode
  // hora, valor, chevron o menú
  trailing?: ReactNode
}

// fila de lista con divisor; para hacerla clickeable envolver el contenido en un Link o botón
export function ListItem({
  title,
  meta,
  leading,
  trailing,
  className,
  ...rest
}: ListItemProps) {
  return (
    <li
      className={cn(
        'border-border-subtle flex items-center gap-4 border-b py-4 last:border-b-0',
        className,
      )}
      {...rest}
    >
      {leading}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">{title}</span>
        {meta && (
          <span className="text-muted-foreground truncate text-sm">{meta}</span>
        )}
      </div>
      {trailing && (
        <div className="text-subtle-foreground shrink-0 text-sm">
          {trailing}
        </div>
      )}
    </li>
  )
}
