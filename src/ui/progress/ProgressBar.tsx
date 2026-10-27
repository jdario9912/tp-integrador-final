import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'
import { clampPercent } from './clamp-percent'

export type ProgressBarProps = ComponentPropsWithoutRef<'div'> & {
  value: number
  max?: number
  // nombre accesible: "Entrenamientos de la semana"
  label: string
}

export function ProgressBar({
  value,
  max = 100,
  label,
  className,
  ...rest
}: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        'bg-primary-soft-strong h-2 w-full rounded-full',
        className,
      )}
      {...rest}
    >
      <div
        className="bg-primary h-full rounded-full transition-[width] duration-300"
        style={{ width: `${clampPercent(value, max)}%` }}
      />
    </div>
  )
}
