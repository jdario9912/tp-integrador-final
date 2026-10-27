import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger'

export type CalloutProps = Omit<ComponentPropsWithoutRef<'div'>, 'title'> & {
  tone?: CalloutTone
  // prefijo en negrita: "Alerta:", "Revisión:"
  title?: ReactNode
}

const toneClasses: Record<CalloutTone, string> = {
  info: 'border-info bg-info-soft',
  success: 'border-success bg-success-soft',
  warning: 'border-warning bg-warning-soft',
  danger: 'border-danger bg-danger-soft',
}

const titleClasses: Record<CalloutTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning-foreground',
  danger: 'text-danger',
}

// danger se anuncia de inmediato (errores de formulario); el resto es informativo
export function Callout({
  tone = 'info',
  title,
  className,
  children,
  ...rest
}: CalloutProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'note'}
      className={cn(
        'text-foreground rounded-r-lg border-l-[3px] px-3.5 py-3 text-sm leading-relaxed',
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {title && <b className={titleClasses[tone]}>{title} </b>}
      {children}
    </div>
  )
}
