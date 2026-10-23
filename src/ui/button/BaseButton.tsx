import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type BaseButtonProps = ComponentPropsWithoutRef<'button'>

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

export function BaseButton({
  className,
  children,
  type = 'button',
  ...rest
}: BaseButtonProps) {
  return (
    <button type={type} className={cn(baseClasses, className)} {...rest}>
      {children}
    </button>
  )
}
