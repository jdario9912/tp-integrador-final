import { cn } from '../../lib/cn'
import { BaseButton, type BaseButtonProps } from './BaseButton'

export function PrimaryButton({ className, ...rest }: BaseButtonProps) {
  return (
    <BaseButton
      className={cn(
        'bg-primary text-primary-foreground hover:bg-primary-hover',
        className,
      )}
      {...rest}
    />
  )
}
