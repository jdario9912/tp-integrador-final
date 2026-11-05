import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import { getMuscleGroups } from '../../lib/exercises/get-muscle-groups'
import {
  createMemoryRouter,
  parsePath,
  RouterProvider,
  type RouterProviderProps,
} from '../../lib/navigation'
import { paths } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import {
  createdExercise,
  exercisesPage,
  muscleGroups,
} from '../../test/exercise-fixtures'
import { getExercises } from './actions/get-exercises'
import { ExercisesPage } from './ExercisesPage'

vi.mock('./actions/get-exercises', () => ({ getExercises: vi.fn() }))
vi.mock('../../lib/exercises/get-muscle-groups', () => ({
  getMuscleGroups: vi.fn(),
}))

let router: RouterProviderProps['router']

const renderPage = (url: string = paths.exercises, state?: unknown) => {
  router = createMemoryRouter(
    [
      { path: paths.exercises, element: <ExercisesPage /> },
      { path: paths.newExercise, element: <p>alta de ejercicio</p> },
    ],
    { initialEntries: [{ ...parsePath(url), state }] },
  )
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const currentSearch = () =>
  new URLSearchParams(router.state.location.search).toString()

const muscleGroupSelect = () =>
  screen.getByRole('combobox', { name: /Grupo muscular/ })

const press = createdExercise({ id: '1', name: 'Press de banca', global: true })
const row = createdExercise({
  id: '2',
  name: 'Remo con barra',
  muscleGroup: 'BACK',
})

beforeEach(() => {
  vi.mocked(getExercises).mockReset()
  vi.mocked(getMuscleGroups).mockReset()
  vi.mocked(getMuscleGroups).mockResolvedValue(muscleGroups)
  saveSession(session('COACH'))
})

describe('ExercisesPage', () => {
  it('lista los ejercicios globales y propios de la primera página', async () => {
    vi.mocked(getExercises).mockResolvedValue(exercisesPage([press, row]))

    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Ejercicios', level: 1 }),
    ).toBeInTheDocument()
    const pressCard = await screen.findByRole('region', {
      name: 'Press de banca',
    })
    expect(pressCard).toHaveTextContent('Global')
    expect(
      screen.getByRole('region', { name: 'Remo con barra' }),
    ).toHaveTextContent('Mío')
    // el nombre del grupo llega con el catálogo
    await waitFor(() => expect(pressCard).toHaveTextContent('Pecho'))
    expect(getExercises).toHaveBeenCalledWith({
      page: 1,
      name: undefined,
      muscleGroup: undefined,
    })
  })

  it('busca por nombre después de dejar de escribir', async () => {
    vi.mocked(getExercises).mockResolvedValue(exercisesPage([press]))
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('region', { name: 'Press de banca' })

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por nombre' }),
      'pre',
    )

    await waitFor(() =>
      expect(getExercises).toHaveBeenLastCalledWith({
        page: 1,
        name: 'pre',
        muscleGroup: undefined,
      }),
    )
    // no se pide una vez por tecla
    expect(getExercises).toHaveBeenCalledTimes(2)
    expect(currentSearch()).toBe('name=pre')
  })

  it('filtra por grupo muscular, combinado con el nombre, y vuelve a la página 1', async () => {
    vi.mocked(getExercises).mockResolvedValue(
      exercisesPage([row], { page: 1, totalPages: 3, totalElements: 45 }),
    )
    const user = userEvent.setup()
    renderPage(`${paths.exercises}?name=remo&page=2`)
    await screen.findByRole('region', { name: 'Remo con barra' })
    await waitFor(() =>
      expect(
        within(muscleGroupSelect()).getByRole('group', { name: 'Core' }),
      ).toBeInTheDocument(),
    )

    await user.selectOptions(muscleGroupSelect(), 'BACK')

    await waitFor(() =>
      expect(currentSearch()).toBe('name=remo&muscleGroup=BACK'),
    )
    expect(getExercises).toHaveBeenLastCalledWith({
      page: 1,
      name: 'remo',
      muscleGroup: 'BACK',
    })

    await user.selectOptions(muscleGroupSelect(), '')
    await waitFor(() => expect(currentSearch()).toBe('name=remo'))
  })

  it('toma la página y los filtros de la URL al entrar', async () => {
    vi.mocked(getExercises).mockResolvedValue(
      exercisesPage([press], { page: 1, totalPages: 2, totalElements: 21 }),
    )

    renderPage(`${paths.exercises}?page=2&name=press&muscleGroup=CHEST`)

    expect(
      screen.getByRole('searchbox', { name: 'Buscar por nombre' }),
    ).toHaveValue('press')
    await waitFor(() => expect(muscleGroupSelect()).toHaveValue('CHEST'))
    expect(getExercises).toHaveBeenCalledWith({
      page: 2,
      name: 'press',
      muscleGroup: 'CHEST',
    })
  })

  it('pagina con Siguiente y guarda la página en la URL', async () => {
    vi.mocked(getExercises).mockImplementation(async ({ page }) =>
      exercisesPage([page === 1 ? press : row], {
        page: page - 1,
        totalPages: 3,
        totalElements: 45,
      }),
    )
    const user = userEvent.setup()
    renderPage()
    const pagination = await screen.findByRole('navigation', {
      name: 'Paginación',
    })
    expect(pagination).toHaveTextContent('Página 1 de 3 · 45 ejercicios')

    await user.click(
      within(pagination).getByRole('button', { name: 'Siguiente' }),
    )

    expect(
      await screen.findByRole('region', { name: 'Remo con barra' }),
    ).toBeInTheDocument()
    expect(currentSearch()).toBe('page=2')
  })

  it('lleva a la última página si la pedida no existe', async () => {
    vi.mocked(getExercises).mockImplementation(async ({ page }) =>
      exercisesPage(page > 3 ? [] : [row], {
        page: page - 1,
        totalPages: 3,
        totalElements: 45,
      }),
    )

    renderPage(`${paths.exercises}?page=99`)

    expect(
      await screen.findByRole('region', { name: 'Remo con barra' }),
    ).toBeInTheDocument()
    expect(currentSearch()).toBe('page=3')
  })

  it('muestra el error y reintenta', async () => {
    vi.mocked(getExercises)
      .mockRejectedValueOnce(new ApiError('Ocurrió un error inesperado', 500))
      .mockResolvedValueOnce(exercisesPage([press]))
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado',
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(
      await screen.findByRole('region', { name: 'Press de banca' }),
    ).toBeInTheDocument()
  })

  it('el botón Nuevo ejercicio lleva al alta', async () => {
    vi.mocked(getExercises).mockResolvedValue(exercisesPage([press]))
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Nuevo ejercicio' }))

    expect(screen.getByText('alta de ejercicio')).toBeInTheDocument()
  })

  it('muestra el aviso del alta y lo limpia sin perder los filtros', async () => {
    vi.mocked(getExercises).mockResolvedValue(exercisesPage([press]))

    renderPage(`${paths.exercises}?muscleGroup=CHEST`, {
      notice: 'Creaste el ejercicio Hip thrust.',
    })

    expect(
      await screen.findByText('Creaste el ejercicio Hip thrust.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.state).toBeNull())
    expect(currentSearch()).toBe('muscleGroup=CHEST')
  })
})
