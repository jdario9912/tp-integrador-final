import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'
import { softToneClasses, type Tone } from '../tone'

export type IconChipProps = ComponentPropsWithoutRef<'span'> & {
  tone?: Tone
  shape?: 'circle' | 'square'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'size-9 [&_svg]:size-5',
  md: 'size-11 [&_svg]:size-5',
  lg: 'size-13 [&_svg]:size-6',
  xl: 'size-22 [&_svg]:size-10',
}

// contenedor decorativo de un icono: el significado lo da el texto que lo acompaña
export function IconChip({
  tone = 'primary',
  shape = 'circle',
  size = 'md',
  className,
  ...rest
}: IconChipProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        shape === 'circle' ? 'rounded-full' : 'rounded-lg',
        sizeClasses[size],
        softToneClasses[tone],
        className,
      )}
      {...rest}
    />
  )
}
