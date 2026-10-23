import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { getFieldErrorId } from './get-field-error-id'

export type FormFieldProps = ComponentPropsWithoutRef<'div'> & {
  label: string
  // id del control, se usa para asociar label y mensaje de error
  htmlFor: string
  error?: string
  required?: boolean
  children: ReactNode
}

export function FormField({
  label,
  htmlFor,
  error,
  required = false,
  className,
  children,
  ...rest
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)} {...rest}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error && (
        <p id={getFieldErrorId(htmlFor)} className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
