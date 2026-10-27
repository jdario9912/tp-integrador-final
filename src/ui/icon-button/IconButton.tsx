import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type IconButtonProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'aria-label'
> & {
  // sin texto visible: el label es lo único que anuncia el lector de pantalla
  'aria-label': string
  shape?: 'round' | 'square'
  // punto de aviso, por ejemplo notificaciones sin leer
  indicator?: boolean
  children: ReactNode
}

const baseClasses =
  'relative inline-flex size-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5'

export function IconButton({
  className,
  children,
  type = 'button',
  shape = 'round',
  indicator = false,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        baseClasses,
        shape === 'round' ? 'rounded-full' : 'rounded-lg',
        className,
      )}
      {...rest}
    >
      {children}
      {indicator && (
        <span
          aria-hidden="true"
          className="bg-danger absolute top-2 right-2 size-2 rounded-full"
        />
      )}
    </button>
  )
}
