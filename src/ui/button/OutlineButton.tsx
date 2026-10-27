import { cn } from '../../lib/cn'
import { BaseButton, type BaseButtonProps } from './BaseButton'

export function OutlineButton({ className, ...rest }: BaseButtonProps) {
  return (
    <BaseButton
      className={cn(
        'border-primary bg-surface text-primary hover:bg-primary-soft border',
        className,
      )}
      {...rest}
    />
  )
}
