import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { MemoryRouter, Route, Routes } from '../../../lib/navigation'
import { paths } from '../../../router/paths'
import { createdFood } from '../../../test/food-fixtures'
import { FoodsList } from './FoodsList'

type Props = ComponentProps<typeof FoodsList>

const renderList = (props: Partial<Props> = {}) =>
  render(
    <MemoryRouter initialEntries={[paths.foods]}>
      <Routes>
        <Route
          path={paths.foods}
          element={
            <FoodsList
              foods={[createdFood()]}
              isPending={false}
              isUpdating={false}
              error={null}
              hasFilters={false}
              canEdit
              onRetry={vi.fn()}
              {...props}
            />
          }
        />
        <Route path={paths.newFood} element={<p>alta de alimento</p>} />
      </Routes>
    </MemoryRouter>,
  )

const foods = [
  createdFood({ id: '1', name: 'Arroz blanco' }),
  createdFood({ id: '2', name: 'Manzana' }),
]

describe('FoodsList', () => {
  it('muestra una card por alimento', () => {
    renderList({ foods })

    const list = screen.getByRole('list', { name: 'Alimentos' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(
      within(list).getByRole('region', { name: 'Arroz blanco' }),
    ).toBeInTheDocument()
    expect(list).toHaveAttribute('aria-busy', 'false')
  })

  it('muestra skeletons en la primera carga', () => {
    renderList({ foods: undefined, isPending: true })

    expect(
      screen.getByRole('status', { name: 'Cargando alimentos' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('mantiene la grilla marcada como ocupada mientras actualiza', () => {
    renderList({ foods, isUpdating: true })

    expect(screen.getByRole('list', { name: 'Alimentos' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it('muestra el error y reintenta', async () => {
    const onRetry = vi.fn()
    renderList({
      foods: undefined,
      error: new ApiError('Ocurrió un error inesperado', 500),
      onRetry,
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('muestra un mensaje genérico si el error no viene de la API', () => {
    renderList({ foods: undefined, error: new TypeError('boom') })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado. Intentá nuevamente.',
    )
  })

  it('sin alimentos invita al entrenador a crear el primero', async () => {
    renderList({ foods: [] })

    expect(
      screen.getByRole('heading', { name: 'Todavía no hay alimentos' }),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Nuevo alimento' }),
    )
    expect(screen.getByText('alta de alimento')).toBeInTheDocument()
  })

  it('al atleta no le ofrece crear alimentos', () => {
    renderList({ foods: [], canEdit: false })

    expect(
      screen.getByRole('heading', { name: 'Todavía no hay alimentos' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Nuevo alimento' }),
    ).not.toBeInTheDocument()
  })

  it('con búsqueda y sin resultados avisa que no hubo coincidencias', () => {
    renderList({ foods: [], hasFilters: true })

    expect(
      screen.getByRole('heading', { name: 'No se encontraron alimentos' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Nuevo alimento' }),
    ).not.toBeInTheDocument()
  })
})
