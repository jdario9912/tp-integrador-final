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
