import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type BaseTextAreaProps = ComponentPropsWithoutRef<'textarea'>

const baseClasses =
  'w-full rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'

export function BaseTextArea({ className, ...rest }: BaseTextAreaProps) {
  return <textarea className={cn(baseClasses, className)} {...rest} />
}
