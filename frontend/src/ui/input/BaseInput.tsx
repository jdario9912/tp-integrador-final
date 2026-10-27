import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type BaseInputProps = ComponentPropsWithoutRef<'input'>

const baseClasses =
  'h-11 w-full rounded-control border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'

export function BaseInput({ className, ...rest }: BaseInputProps) {
  return <input className={cn(baseClasses, className)} {...rest} />
}
