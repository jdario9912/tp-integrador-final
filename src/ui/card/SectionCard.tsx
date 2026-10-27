import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { IconChip } from '../icon-chip'
import { Card, type CardProps } from './Card'

export type SectionCardProps = Omit<CardProps, 'title'> & {
  title: ReactNode
  icon: ReactNode
}

// bloque de formulario con encabezado de icono y divisor (alta de atleta, perfil)
export function SectionCard({
  title,
  icon,
  className,
  children,
  ...rest
}: SectionCardProps) {
  return (
    <Card className={cn('flex flex-col gap-5', className)} {...rest}>
      <div className="border-border-subtle flex items-center gap-3 border-b pb-4">
        <IconChip shape="square" size="sm">
          {icon}
        </IconChip>
        <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      </div>
      {children}
    </Card>
  )
}
