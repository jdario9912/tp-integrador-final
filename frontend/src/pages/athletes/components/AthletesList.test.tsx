import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { paths } from '../../../router/paths'
import { createdAthlete } from '../../../test/athlete-fixtures'
import { AthletesList } from './AthletesList'

type Props = ComponentProps<typeof AthletesList>

const renderList = (props: Partial<Props> = {}) =>
  render(
    <MemoryRouter initialEntries={['/athletes']}>
      <Routes>
        <Route
          path="/athletes"
          element={
            <AthletesList
              athletes={[createdAthlete()]}
              isPending={false}
              isUpdating={false}
              error={null}
              hasFilters={false}
              onRetry={vi.fn()}
              {...props}
            />
          }
        />
        <Route path={paths.newAthlete} element={<p>alta de atleta</p>} />
      </Routes>
    </MemoryRouter>,
  )

const athletes = [
  createdAthlete({ id: '1', firstName: 'Juana', lastName: 'Pérez' }),
  createdAthlete({ id: '2', firstName: 'Lucas', lastName: 'Gómez' }),
  createdAthlete({ id: '3', firstName: 'Sofía', lastName: 'Ramírez' }),
]

describe('AthletesList', () => {
  it('muestra una card por atleta', () => {
    renderList({ athletes })

    const list = screen.getByRole('list', { name: 'Atletas' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(
      within(list).getByRole('region', { name: 'Lucas Gómez' }),
    ).toBeInTheDocument()
    expect(list).toHaveAttribute('aria-busy', 'false')
  })

  it('muestra skeletons en la primera carga', () => {
    renderList({ athletes: undefined, isPending: true })

    expect(
      screen.getByRole('status', { name: 'Cargando atletas' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('mantiene la grilla marcada como ocupada mientras actualiza', () => {
    renderList({ athletes, isUpdating: true })

    expect(screen.getByRole('list', { name: 'Atletas' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it.each([
    [new ApiError('Ocurrió un error inesperado', 500)],
    [new ApiError('No tiene permisos para acceder a este recurso', 403)],
    [new ApiError('No se pudo conectar con el servidor', 0)],
  ])('muestra el mensaje del error "%s"', (error) => {
    renderList({ athletes: undefined, error })

    expect(screen.getByRole('alert')).toHaveTextContent(error.message)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('muestra un mensaje genérico si el error no viene de la API', () => {
    renderList({ athletes: undefined, error: new TypeError('boom') })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado. Intentá nuevamente.',
    )
  })

  it('reintenta al tocar Reintentar', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    renderList({
      athletes: undefined,
      error: new ApiError('Error', 500),
      onRetry,
    })

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('sin atletas invita a dar de alta el primero', async () => {
    const user = userEvent.setup()
    renderList({ athletes: [] })

    expect(
      screen.getByRole('heading', { name: 'Todavía no tenés atletas' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Agregar atleta' }))

    expect(screen.getByText('alta de atleta')).toBeInTheDocument()
  })

  it('con filtros y sin resultados avisa que no hubo coincidencias', () => {
    renderList({ athletes: [], hasFilters: true })

    expect(
      screen.getByRole('heading', { name: 'No se encontraron atletas' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Agregar atleta' }),
    ).not.toBeInTheDocument()
  })
})
