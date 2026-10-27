import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { BaseInput, type BaseInputProps } from './BaseInput'

export type TextInputProps = BaseInputProps & {
  // icono al inicio (mail, lock, search)
  leadingIcon?: ReactNode
  // unidad o texto al final (kg, cm, años)
  suffix?: ReactNode
}

const colorClasses =
  'border-border bg-surface text-foreground placeholder:text-subtle-foreground focus-visible:ring-ring aria-invalid:border-danger aria-invalid:focus-visible:ring-danger'

// con adornos el borde y el foco pasan al contenedor, el input queda transparente
const groupClasses =
  'flex h-11 w-full items-center gap-2.5 rounded-control border border-border bg-surface px-3 text-sm transition-colors has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring has-[input:focus-visible]:ring-offset-1 has-[input:disabled]:opacity-50 has-[input[aria-invalid=true]]:border-danger has-[input[aria-invalid=true]]:ring-danger [&_svg]:size-5 [&_svg]:shrink-0'

export function TextInput({
  className,
  type = 'text',
  leadingIcon,
  suffix,
  ...rest
}: TextInputProps) {
  if (!leadingIcon && !suffix) {
    return (
      <BaseInput
        type={type}
        className={cn(colorClasses, className)}
        {...rest}
      />
    )
  }

  return (
    <div className={cn(groupClasses, className)}>
      {leadingIcon && (
        <span aria-hidden="true" className="text-subtle-foreground flex">
          {leadingIcon}
        </span>
      )}
      <input
        type={type}
        className="text-foreground placeholder:text-subtle-foreground h-full min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
        {...rest}
      />
      {suffix && (
        <span className="text-subtle-foreground shrink-0 text-sm">
          {suffix}
        </span>
      )}
    </div>
  )
}
