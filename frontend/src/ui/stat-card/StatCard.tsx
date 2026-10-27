import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Card, type CardProps } from '../card'
import { IconChip } from '../icon-chip'
import type { Tone } from '../tone'

export type StatCardProps = Omit<CardProps, 'tone' | 'title'> & {
  label: string
  value: ReactNode
  icon: ReactNode
  tone?: Tone
  // contenido bajo el valor: tendencia, barra de progreso o texto secundario
  footer?: ReactNode
}

// KPI: con tono danger el valor y el borde también se tiñen (requiere atención)
export function StatCard({
  label,
  value,
  icon,
  tone = 'primary',
  footer,
  className,
  ...rest
}: StatCardProps) {
  const isDanger = tone === 'danger'

  return (
    <Card
      padding="sm"
      tone={isDanger ? 'danger' : 'default'}
      className={cn('flex flex-col gap-3.5', className)}
      {...rest}
    >
      <IconChip tone={tone}>{icon}</IconChip>
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span
          className={cn(
            'text-2xl font-bold tracking-tight sm:text-3xl',
            isDanger && 'text-danger',
          )}
        >
          {value}
        </span>
        {footer}
      </div>
    </Card>
  )
}
