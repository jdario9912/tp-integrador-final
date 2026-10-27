import { cn } from '../../lib/cn'
import { BaseButton, type BaseButtonProps } from './BaseButton'

export function DangerButton({ className, ...rest }: BaseButtonProps) {
  return (
    <BaseButton
      className={cn(
        'bg-danger text-danger-foreground hover:bg-danger-hover focus-visible:ring-danger',
        className,
      )}
      {...rest}
    />
  )
}
