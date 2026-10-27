import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type SkeletonProps = ComponentPropsWithoutRef<'div'>

// placeholder de carga: el tamaño se define con className (h-4 w-32, size-12 rounded-full)
export function Skeleton({ className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-secondary animate-pulse rounded-md', className)}
      {...rest}
    />
  )
}
