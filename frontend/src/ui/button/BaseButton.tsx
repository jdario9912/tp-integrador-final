import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type ButtonSize = 'sm' | 'md' | 'lg'

export type BaseButtonProps = ComponentPropsWithoutRef<'button'> & {
  size?: ButtonSize
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0'

// sm: acciones dentro de cards, md: acciones de página, lg: formularios de auth y móvil
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-10 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-13 px-6 text-base',
}

export function BaseButton({
  className,
  children,
  type = 'button',
  size = 'md',
  ...rest
}: BaseButtonProps) {
  return (
    <button
      type={type}
      className={cn(baseClasses, sizeClasses[size], className)}
      {...rest}
    >
      {children}
    </button>
  )
}
