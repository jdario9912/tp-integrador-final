import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { MemoryRouter, Route, Routes } from '../../../lib/navigation'
import { paths } from '../../../router/paths'
import { createdExercise, muscleGroups } from '../../../test/exercise-fixtures'
import { ExercisesList } from './ExercisesList'

type Props = ComponentProps<typeof ExercisesList>

const renderList = (props: Partial<Props> = {}) =>
  render(
    <MemoryRouter initialEntries={[paths.exercises]}>
      <Routes>
        <Route
          path={paths.exercises}
          element={
            <ExercisesList
              exercises={[createdExercise()]}
              muscleGroups={muscleGroups}
              isPending={false}
              isUpdating={false}
              error={null}
              hasFilters={false}
              onRetry={vi.fn()}
              {...props}
            />
          }
        />
        <Route path={paths.newExercise} element={<p>alta de ejercicio</p>} />
      </Routes>
    </MemoryRouter>,
  )

const exercises = [
  createdExercise({ id: '1', name: 'Press de banca', global: true }),
  createdExercise({ id: '2', name: 'Remo con barra', muscleGroup: 'BACK' }),
]

describe('ExercisesList', () => {
  it('muestra una card por ejercicio con el nombre del grupo muscular', () => {
    renderList({ exercises })

    const list = screen.getByRole('list', { name: 'Ejercicios' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(
      within(list).getByRole('region', { name: 'Remo con barra' }),
    ).toHaveTextContent('Espalda')
    expect(list).toHaveAttribute('aria-busy', 'false')
  })

  it('muestra skeletons en la primera carga', () => {
    renderList({ exercises: undefined, isPending: true })

    expect(
      screen.getByRole('status', { name: 'Cargando ejercicios' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('mantiene la grilla marcada como ocupada mientras actualiza', () => {
    renderList({ exercises, isUpdating: true })

    expect(screen.getByRole('list', { name: 'Ejercicios' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it('muestra el error y reintenta', async () => {
    const onRetry = vi.fn()
    renderList({
      exercises: undefined,
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
    renderList({ exercises: undefined, error: new TypeError('boom') })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado. Intentá nuevamente.',
    )
  })

  it('sin ejercicios invita a crear el primero', async () => {
    renderList({ exercises: [] })

    expect(
      screen.getByRole('heading', { name: 'Todavía no hay ejercicios' }),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Nuevo ejercicio' }),
    )
    expect(screen.getByText('alta de ejercicio')).toBeInTheDocument()
  })

  it('con filtros y sin resultados avisa que no hubo coincidencias', () => {
    renderList({ exercises: [], hasFilters: true })

    expect(
      screen.getByRole('heading', { name: 'No se encontraron ejercicios' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Nuevo ejercicio' }),
    ).not.toBeInTheDocument()
  })
})
