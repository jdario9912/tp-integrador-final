import { cn } from '../../lib/cn'
import { BaseButton, type BaseButtonProps } from './BaseButton'

// acción de "agregar otro" al final de una lista (ejercicio, día, serie)
export function DashedButton({ className, ...rest }: BaseButtonProps) {
  return (
    <BaseButton
      className={cn(
        'border-border text-primary hover:border-primary hover:bg-primary-soft w-full border-[1.5px] border-dashed bg-transparent',
        className,
      )}
      {...rest}
    />
  )
}
