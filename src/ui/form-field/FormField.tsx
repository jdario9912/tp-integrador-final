import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { getFieldErrorId, getFieldHintId } from './get-field-error-id'

export type FormFieldProps = ComponentPropsWithoutRef<'div'> & {
  label: string
  // id del control, se usa para asociar label y mensaje de error
  htmlFor: string
  error?: string
  // texto de ayuda bajo el control, se oculta mientras hay error
  hint?: string
  required?: boolean
  children: ReactNode
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  className,
  children,
  ...rest
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)} {...rest}>
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p
          id={getFieldHintId(htmlFor)}
          className="text-muted-foreground text-sm"
        >
          {hint}
        </p>
      )}
      {error && (
        <p id={getFieldErrorId(htmlFor)} className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
