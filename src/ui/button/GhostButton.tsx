import { cn } from '../../lib/cn'
import { BaseButton, type BaseButtonProps } from './BaseButton'

export function GhostButton({ className, ...rest }: BaseButtonProps) {
  return (
    <BaseButton
      className={cn(
        'text-muted-foreground hover:bg-muted hover:text-foreground bg-transparent',
        className,
      )}
      {...rest}
    />
  )
}
