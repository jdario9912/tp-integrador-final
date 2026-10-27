import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type CheckboxProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  children: ReactNode
}

export function Checkbox({ className, children, ...rest }: CheckboxProps) {
  return (
    <label
      className={cn(
        'text-foreground inline-flex cursor-pointer items-center gap-2 text-sm has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50',
        className,
      )}
    >
      <input
        type="checkbox"
        className="accent-primary focus-visible:ring-ring size-4.5 cursor-pointer rounded focus-visible:ring-2 focus-visible:outline-none"
        {...rest}
      />
      {children}
    </label>
  )
}
