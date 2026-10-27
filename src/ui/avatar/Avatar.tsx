import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'
import { softToneClasses, type Tone } from '../tone'
import { initialsOf } from './initials-of'

export type AvatarStatus = 'active' | 'alert' | 'inactive'

export type AvatarProps = ComponentPropsWithoutRef<'span'> & {
  firstName: string
  lastName: string
  // foto de perfil; sin ella se muestran las iniciales
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  tone?: Tone
  status?: AvatarStatus
}

const sizeClasses = {
  xs: 'size-8 text-xs',
  sm: 'size-10 text-sm',
  md: 'size-11 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-23 text-3xl',
}

const statusClasses: Record<AvatarStatus, string> = {
  active: 'bg-success',
  alert: 'bg-danger',
  inactive: 'bg-subtle-foreground',
}

const statusLabels: Record<AvatarStatus, string> = {
  active: 'Activo',
  alert: 'Requiere atención',
  inactive: 'Inactivo',
}

export function Avatar({
  firstName,
  lastName,
  src,
  size = 'sm',
  tone = 'primary',
  status,
  className,
  ...rest
}: AvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)} {...rest}>
      {src ? (
        <img
          src={src}
          alt={`${firstName} ${lastName}`}
          className={cn('rounded-full object-cover', sizeClasses[size])}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex items-center justify-center rounded-full font-bold',
            sizeClasses[size],
            softToneClasses[tone],
          )}
        >
          {initialsOf(firstName, lastName)}
        </span>
      )}
      {status && (
        <span
          role="img"
          aria-label={statusLabels[status]}
          className={cn(
            'border-surface absolute right-0 bottom-0 size-3.5 rounded-full border-2',
            statusClasses[status],
          )}
        />
      )}
    </span>
  )
}
