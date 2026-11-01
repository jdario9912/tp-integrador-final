import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type DescriptionItemProps = ComponentPropsWithoutRef<'div'> & {
  label: string
}

// un dato de la DescriptionList: el valor va como children. Etiqueta en muted sobre la
// superficie blanca (sobre bg-muted no llega al contraste AA)
export function DescriptionItem({
  label,
  className,
  children,
  ...rest
}: DescriptionItemProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)} {...rest}>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-[15px] font-semibold break-words">{children}</dd>
    </div>
  )
}
