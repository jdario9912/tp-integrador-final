import { cn } from '../../lib/cn'
import { BaseSelect, type BaseSelectProps } from './BaseSelect'

export function Select({ className, ...rest }: BaseSelectProps) {
  return (
    <BaseSelect
      className={cn(
        'border-border bg-surface text-foreground focus-visible:ring-ring aria-invalid:border-danger aria-invalid:focus-visible:ring-danger',
        className,
      )}
      {...rest}
    />
  )
}
