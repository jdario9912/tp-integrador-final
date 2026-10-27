import { cn } from '../../lib/cn'
import { BaseTextArea, type BaseTextAreaProps } from './BaseTextArea'

export function TextArea({ className, ...rest }: BaseTextAreaProps) {
  return (
    <BaseTextArea
      className={cn(
        'border-border bg-surface text-foreground placeholder:text-subtle-foreground focus-visible:ring-ring aria-invalid:border-danger aria-invalid:focus-visible:ring-danger',
        className,
      )}
      {...rest}
    />
  )
}
