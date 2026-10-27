import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { SecondaryButton } from '../button'

export type PaginationProps = ComponentPropsWithoutRef<'nav'> & {
  // página actual, desde 1
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  // resumen opcional junto a la página ("12 atletas")
  summary?: ReactNode
  disabled?: boolean
}

// anterior / siguiente; con una sola página no se muestra
export function Pagination({
  page,
  totalPages,
  onPageChange,
  summary,
  disabled = false,
  className,
  ...rest
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label="Paginación"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        className,
      )}
      {...rest}
    >
      <p className="text-muted-foreground text-sm">
        Página {page} de {totalPages}
        {summary && <> · {summary}</>}
      </p>
      <div className="flex gap-2">
        <SecondaryButton
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" /> Anterior
        </SecondaryButton>
        <SecondaryButton
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente <ChevronRight aria-hidden="true" />
        </SecondaryButton>
      </div>
    </nav>
  )
}
