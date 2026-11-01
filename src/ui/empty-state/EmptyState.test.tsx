import { render, screen } from '@testing-library/react'
import { UserX } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Skeleton } from '../skeleton'
import { Spinner } from '../spinner'
import { EmptyState } from '.'

describe('EmptyState', () => {
  it('muestra título, descripción y acción', () => {
    render(
      <EmptyState
        icon={<UserX />}
        title="No se encontraron atletas"
        description="Probá ajustar la búsqueda."
        action={<button>Agregar atleta</button>}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'No se encontraron atletas' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Probá ajustar la búsqueda.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Agregar atleta' }),
    ).toBeInTheDocument()
  })

  it('en tamaño sm achica el espaciado y el título para ir dentro de una card', () => {
    render(
      <EmptyState
        size="sm"
        icon={<UserX />}
        title="Sin rutina asignada"
        className="px-2"
      />,
    )
    const title = screen.getByRole('heading', { name: 'Sin rutina asignada' })
    expect(title).toHaveClass('text-base')
    expect(title.parentElement).toHaveClass('py-6', 'px-2')
    expect(title.parentElement).not.toHaveClass('py-16')
  })
})

describe('Spinner y Skeleton', () => {
  it('Spinner se anuncia como estado y Skeleton queda oculto', () => {
    const { container } = render(
      <>
        <Spinner label="Cargando atletas" />
        <Skeleton className="h-4 w-32" />
      </>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Cargando atletas')
    expect(container.querySelector('.animate-pulse')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })
})
