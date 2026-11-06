import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { MemoryRouter, Route, Routes } from '../../../lib/navigation'
import { paths } from '../../../router/paths'
import { createdRoutine } from '../../../test/routine-fixtures'
import { RoutinesList } from './RoutinesList'

type Props = ComponentProps<typeof RoutinesList>

const renderList = (props: Partial<Props> = {}) =>
  render(
    <MemoryRouter initialEntries={[paths.routines]}>
      <Routes>
        <Route
          path={paths.routines}
          element={
            <RoutinesList
              routines={[createdRoutine()]}
              isPending={false}
              isUpdating={false}
              error={null}
              onRetry={vi.fn()}
              {...props}
            />
          }
        />
        <Route path={paths.newRoutine} element={<p>alta de rutina</p>} />
      </Routes>
    </MemoryRouter>,
  )

const routines = [
  createdRoutine({ id: '1', name: 'Fase de volumen' }),
  createdRoutine({ id: '2', name: 'Fuerza 5x5', isTemplate: true }),
]

describe('RoutinesList', () => {
  it('muestra una card por rutina', () => {
    renderList({ routines })

    const list = screen.getByRole('list', { name: 'Rutinas' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(
      within(list).getByRole('region', { name: 'Fuerza 5x5' }),
    ).toHaveTextContent('Plantilla')
    expect(list).toHaveAttribute('aria-busy', 'false')
  })

  it('muestra skeletons en la primera carga', () => {
    renderList({ routines: undefined, isPending: true })

    expect(
      screen.getByRole('status', { name: 'Cargando rutinas' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('mantiene la grilla marcada como ocupada mientras actualiza', () => {
    renderList({ routines, isUpdating: true })

    expect(screen.getByRole('list', { name: 'Rutinas' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it('muestra el error y reintenta', async () => {
    const onRetry = vi.fn()
    renderList({
      routines: undefined,
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
    renderList({ routines: undefined, error: new TypeError('boom') })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado. Intentá nuevamente.',
    )
  })

  it('sin rutinas invita a crear la primera', async () => {
    renderList({ routines: [] })

    expect(
      screen.getByRole('heading', { name: 'Todavía no tenés rutinas' }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Nueva rutina' }))
    expect(screen.getByText('alta de rutina')).toBeInTheDocument()
  })
})
