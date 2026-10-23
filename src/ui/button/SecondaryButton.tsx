import { cn } from '../../lib/cn'
import { BaseButton, type BaseButtonProps } from './BaseButton'

export function SecondaryButton({ className, ...rest }: BaseButtonProps) {
  return (
    <BaseButton
      className={cn(
        'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        className,
      )}
      {...rest}
    />
  )
}
