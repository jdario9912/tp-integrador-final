import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { clampPercent } from './clamp-percent'

export type ProgressRingProps = ComponentPropsWithoutRef<'div'> & {
  value: number
  max?: number
  label: string
  // contenido central, por defecto "value/max"
  children?: ReactNode
}

export function ProgressRing({
  value,
  max = 100,
  label,
  className,
  children,
  ...rest
}: ProgressRingProps) {
  const percent = clampPercent(value, max)

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        'flex size-22 shrink-0 items-center justify-center rounded-full',
        className,
      )}
      style={{
        background: `conic-gradient(var(--color-primary) ${percent}%, var(--color-primary-soft-strong) 0)`,
      }}
      {...rest}
    >
      <div className="bg-surface flex size-[75%] items-center justify-center rounded-full text-lg font-bold">
        {children ?? `${value}/${max}`}
      </div>
    </div>
  )
}
