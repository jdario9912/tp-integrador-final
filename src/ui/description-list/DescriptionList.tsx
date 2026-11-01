import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type DescriptionListProps = ComponentPropsWithoutRef<'dl'>

// datos etiqueta-valor (ficha del atleta): con <dl> el lector de pantalla asocia cada valor a su
// etiqueta. Por defecto, dos columnas desde sm; las columnas se cambian con className
export function DescriptionList({ className, ...rest }: DescriptionListProps) {
  return (
    <dl
      className={cn(
        'grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2',
        className,
      )}
      {...rest}
    />
  )
}
