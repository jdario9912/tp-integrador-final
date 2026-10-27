import { LoaderCircle } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type SpinnerProps = ComponentPropsWithoutRef<'span'> & {
  label?: string
}

export function Spinner({
  label = 'Cargando',
  className,
  ...rest
}: SpinnerProps) {
  return (
    <span
      role="status"
      className={cn('text-primary inline-flex', className)}
      {...rest}
    >
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
