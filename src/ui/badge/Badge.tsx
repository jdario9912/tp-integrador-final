import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'
import { softToneClasses, type Tone } from '../tone'

export type BadgeProps = ComponentPropsWithoutRef<'span'> & {
  tone?: Tone
  shape?: 'rounded' | 'pill'
  // outline: solo borde, para etiquetas secundarias (grupos musculares)
  variant?: 'soft' | 'outline'
  // punto de color antes del texto (estado)
  dot?: boolean
}

const outlineToneClasses: Record<Tone, string> = {
  primary: 'border-primary-soft-strong text-primary',
  neutral: 'border-border text-muted-foreground',
  success: 'border-success/30 text-success',
  warning: 'border-warning/40 text-warning-foreground',
  danger: 'border-danger/30 text-danger',
  info: 'border-info/30 text-info',
}

export function Badge({
  tone = 'neutral',
  shape = 'rounded',
  variant = 'soft',
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 self-start text-xs font-semibold whitespace-nowrap [&_svg]:size-4',
        shape === 'pill' ? 'rounded-full px-3 py-1' : 'rounded-md px-2 py-0.5',
        variant === 'soft'
          ? softToneClasses[tone]
          : cn('border bg-transparent', outlineToneClasses[tone]),
        className,
      )}
      {...rest}
    >
      {dot && (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  )
}
