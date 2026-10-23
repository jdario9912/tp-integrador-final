import { cn } from '../../lib/cn'
import { BaseInput, type BaseInputProps } from './BaseInput'

export function TextInput({
  className,
  type = 'text',
  ...rest
}: BaseInputProps) {
  return (
    <BaseInput
      type={type}
      className={cn(
        'border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring aria-invalid:border-danger aria-invalid:focus-visible:ring-danger',
        className,
      )}
      {...rest}
    />
  )
}
