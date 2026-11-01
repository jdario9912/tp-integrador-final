import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { IconChip, type IconChipProps } from '../icon-chip'

export type EmptyStateProps = Omit<ComponentPropsWithoutRef<'div'>, 'title'> & {
  icon: ReactNode
  title: string
  description?: ReactNode
  // botón o link para salir del estado vacío
  action?: ReactNode
  // md: ocupa la página o un listado; sm: dentro de una card (secciones de la ficha)
  size?: 'md' | 'sm'
}

type SizeStyles = {
  root: string
  chip: IconChipProps['size']
  title: string
  description: string
}

const sizeStyles: Record<NonNullable<EmptyStateProps['size']>, SizeStyles> = {
  md: {
    root: 'gap-4 py-16',
    chip: 'xl',
    title: 'text-xl',
    description: 'text-[15px]',
  },
  sm: {
    root: 'gap-3 py-6',
    chip: 'lg',
    title: 'text-base',
    description: 'text-sm',
  },
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  className,
  ...rest
}: EmptyStateProps) {
  const styles = sizeStyles[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        styles.root,
        className,
      )}
      {...rest}
    >
      <IconChip tone="neutral" size={styles.chip}>
        {icon}
      </IconChip>
      <h3 className={cn('font-semibold', styles.title)}>{title}</h3>
      {description && (
        <p className={cn('text-muted-foreground max-w-md', styles.description)}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
