import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type CardProps = ComponentPropsWithoutRef<'section'> & {
  padding?: 'none' | 'sm' | 'md'
  // danger: requiere atención; highlight: superficie primary (notas destacadas)
  tone?: 'default' | 'danger' | 'highlight'
}

const paddingClasses = { none: '', sm: 'p-5', md: 'p-5 sm:p-6' }

const toneClasses = {
  default: 'border-border-subtle bg-surface text-foreground',
  danger: 'border-danger/25 bg-surface text-foreground',
  highlight: 'border-primary bg-primary text-primary-foreground',
}

export function Card({
  className,
  padding = 'md',
  tone = 'default',
  ...rest
}: CardProps) {
  return (
    <section
      className={cn(
        'rounded-card shadow-card border',
        paddingClasses[padding],
        toneClasses[tone],
        className,
      )}
      {...rest}
    />
  )
}
