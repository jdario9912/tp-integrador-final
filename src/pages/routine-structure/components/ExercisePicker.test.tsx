import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { session } from '../../../test/auth-fixtures'
import {
  createdExercise,
  exercisesPage,
  muscleGroups,
} from '../../../test/exercise-fixtures'
import { searchExercises } from '../actions/search-exercises'
import { ExercisePicker } from './ExercisePicker'

vi.mock('../actions/search-exercises', () => ({ searchExercises: vi.fn() }))

const press = createdExercise()
const squat = createdExercise({
  id: 'squat',
  name: 'Sentadilla',
  muscleGroup: 'QUADRICEPS',
  global: true,
})

const renderPicker = () => {
  const onPick = vi.fn()
  const onClose = vi.fn()
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ExercisePicker
        onPick={onPick}
        onClose={onClose}
        muscleGroups={muscleGroups}
      />
    </QueryClientProvider>,
  )
  return { onPick, onClose }
}

const search = () => screen.getByRole('searchbox', { name: 'Buscar ejercicio' })

beforeEach(() => {
  vi.mocked(searchExercises).mockReset()
  saveSession(session('COACH'))
})

describe('ExercisePicker', () => {
  it('lista el catálogo y agrega el ejercicio elegido sin cerrarse', async () => {
    vi.mocked(searchExercises).mockResolvedValue(exercisesPage([press, squat]))
    const { onPick, onClose } = renderPicker()

    expect(search()).toHaveFocus()
    expect(
      screen.getByRole('status', { name: 'Buscando ejercicios' }),
    ).toBeInTheDocument()
    const results = await screen.findByRole('list', { name: 'Resultados' })
    expect(within(results).getByText('Cuádriceps')).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar Sentadilla' }),
    )

    expect(onPick).toHaveBeenCalledWith(squat)
    expect(screen.getByText('Agregaste Sentadilla.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('busca por nombre y grupo muscular', async () => {
    vi.mocked(searchExercises).mockResolvedValue(exercisesPage([press]))
    renderPicker()

    await userEvent.type(search(), 'press')
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /Grupo/ }),
      'CHEST',
    )

    await waitFor(() =>
      expect(searchExercises).toHaveBeenLastCalledWith({
        name: 'press',
        muscleGroup: 'CHEST',
      }),
    )
  })

  it('Enter agrega el primer resultado y Escape cierra', async () => {
    vi.mocked(searchExercises).mockResolvedValue(exercisesPage([press, squat]))
    const { onPick, onClose } = renderPicker()

    await screen.findByRole('list', { name: 'Resultados' })
    await userEvent.type(search(), '{Enter}')
    expect(onPick).toHaveBeenCalledWith(press)

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Enter no agrega un resultado de una búsqueda anterior', async () => {
    vi.mocked(searchExercises).mockImplementation(async ({ name }) =>
      exercisesPage(name ? [squat] : [press, squat]),
    )
    const { onPick } = renderPicker()

    await screen.findByRole('button', { name: 'Agregar Press de banca' })
    await userEvent.type(search(), 'sentadilla{Enter}')
    expect(onPick).not.toHaveBeenCalled()

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Agregar Press de banca' }),
      ).not.toBeInTheDocument(),
    )
    await userEvent.type(search(), '{Enter}')
    expect(onPick).toHaveBeenCalledWith(squat)
  })

  it('avisa cuando hay más resultados que los mostrados', async () => {
    vi.mocked(searchExercises).mockResolvedValue(
      exercisesPage([press], { totalElements: 45, totalPages: 45 }),
    )
    renderPicker()

    expect(
      await screen.findByText(
        'Se muestran 1 de 45. Refiná la búsqueda para encontrar otros.',
      ),
    ).toBeInTheDocument()
  })

  it('sin resultados lo indica', async () => {
    vi.mocked(searchExercises).mockResolvedValue(exercisesPage([]))
    renderPicker()

    expect(
      await screen.findByText(
        'No hay ejercicios que coincidan con la búsqueda.',
      ),
    ).toBeInTheDocument()
  })

  it('permite reintentar si falla la búsqueda', async () => {
    vi.mocked(searchExercises)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValueOnce(exercisesPage([press]))
    renderPicker()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(
      await screen.findByRole('button', { name: 'Agregar Press de banca' }),
    ).toBeInTheDocument()
  })

  it('el botón de cerrar cierra el buscador', async () => {
    vi.mocked(searchExercises).mockResolvedValue(exercisesPage())
    const { onClose } = renderPicker()

    await userEvent.click(
      screen.getByRole('button', { name: 'Cerrar buscador' }),
    )

    expect(onClose).toHaveBeenCalledOnce()
  })
})
