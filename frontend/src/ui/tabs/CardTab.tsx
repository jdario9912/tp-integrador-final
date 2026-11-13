import { cn } from '../../lib/cn'
import { BaseTab, type BaseTabProps } from './BaseTab'

// pestaña con forma de tarjeta (tira de días de la rutina). La seleccionada va llena de primary;
// `group` deja que el contenido cambie de color con group-aria-selected:
export function CardTab({ className, ...rest }: BaseTabProps) {
  return (
    <BaseTab
      className={cn(
        'group rounded-control border-border bg-surface text-foreground hover:border-primary aria-selected:border-primary aria-selected:bg-primary aria-selected:text-primary-foreground flex-col items-start justify-center border px-3 py-2 text-left',
        className,
      )}
      {...rest}
    />
  )
}
