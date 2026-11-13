import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveSession, type Role } from '../lib/auth'
import { authResponse, session } from '../test/auth-fixtures'
import { createdFood, foodsPage } from '../test/food-fixtures'
import { SESSION_ID, trainingSession } from '../test/training-session-fixtures'
import { weightsPage } from '../test/weight-fixtures'
import { foodEditPath, paths, trainingPath } from './paths'

vi.mock('../lib/auth/get-current-user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('../lib/weights/get-weights', () => ({ getWeights: vi.fn() }))
vi.mock('../lib/athlete-routine/get-athlete-routine', () => ({
  getAthleteRoutine: vi.fn(),
}))
vi.mock('../lib/exercises/get-muscle-groups', () => ({
  getMuscleGroups: vi.fn(),
}))
vi.mock('../pages/foods/actions/get-foods', () => ({ getFoods: vi.fn() }))
vi.mock('../lib/training-sessions/get-in-progress-session', () => ({
  getInProgressSession: vi.fn(),
}))
vi.mock('../lib/training-sessions/get-training-session', () => ({
  getTrainingSession: vi.fn(),
}))

// AppRouter crea el router al importarse, con la URL de ese momento: cada test lo importa
// de nuevo (resetModules) y configura los mocks de esa importación
const renderAppAt = async (path: string, role: Role) => {
  vi.resetModules()
  window.history.replaceState(null, '', path)
  saveSession(session(role))
  const { getCurrentUser } = await import('../lib/auth/get-current-user')
  vi.mocked(getCurrentUser).mockResolvedValue(authResponse(role).user)
  const { getWeights } = await import('../lib/weights/get-weights')
  vi.mocked(getWeights).mockResolvedValue(weightsPage([]))
  const { getAthleteRoutine } =
    await import('../lib/athlete-routine/get-athlete-routine')
  vi.mocked(getAthleteRoutine).mockResolvedValue(null)
  const { getMuscleGroups } = await import('../lib/exercises/get-muscle-groups')
  vi.mocked(getMuscleGroups).mockResolvedValue([])
  const { getFoods } = await import('../pages/foods/actions/get-foods')
  vi.mocked(getFoods).mockResolvedValue(foodsPage([createdFood()]))
  const { getInProgressSession } =
    await import('../lib/training-sessions/get-in-progress-session')
  vi.mocked(getInProgressSession).mockResolvedValue(null)
  const { getTrainingSession } =
    await import('../lib/training-sessions/get-training-session')
  vi.mocked(getTrainingSession).mockResolvedValue(trainingSession())
  const { AppRouter } = await import('./AppRouter')

  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AppRouter />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('AppRouter · Mi rutina (US-17)', () => {
  it('el atleta entra a /my-routine y la barra muestra "Mi rutina"', async () => {
    await renderAppAt(paths.myRoutine, 'ATHLETE')

    expect(
      await screen.findByRole('heading', { name: 'Mi rutina', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Ubicación' }),
    ).toHaveTextContent('Mi rutina')
    expect(window.location.pathname).toBe(paths.myRoutine)
    // la página pide la rutina del atleta: sin asignación, el mensaje de CE-1
    expect(
      await screen.findByText('Tu entrenador aún no te asignó una rutina'),
    ).toBeInTheDocument()
  })

  it('un entrenador que entra a /my-routine vuelve al panel', async () => {
    await renderAppAt(paths.myRoutine, 'COACH')

    expect(
      await screen.findByRole('heading', { level: 1, name: /Bienvenido/ }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe(paths.dashboard)
    expect(
      screen.queryByRole('heading', { name: 'Mi rutina', level: 1 }),
    ).not.toBeInTheDocument()
  })
})

describe('AppRouter · Entrenamiento (US-18)', () => {
  it('el atleta entra a /training/:sessionId y la barra muestra "Entrenamiento"', async () => {
    await renderAppAt(trainingPath(SESSION_ID), 'ATHLETE')

    expect(
      await screen.findByRole('heading', {
        name: 'Entrenamiento en curso',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Ubicación' }),
    ).toHaveTextContent('Entrenamiento')
    expect(window.location.pathname).toBe(trainingPath(SESSION_ID))
    expect(
      await screen.findByRole('heading', { name: 'Día 1: Torso', level: 2 }),
    ).toBeInTheDocument()
  })

  it('no tiene entrada propia en el menú del atleta', async () => {
    await renderAppAt(trainingPath(SESSION_ID), 'ATHLETE')

    const menu = await screen.findByRole('navigation', { name: 'Principal' })
    expect(
      within(menu).queryByRole('link', { name: /Entrenamiento/ }),
    ).not.toBeInTheDocument()
    expect(
      within(menu).getByRole('link', { name: 'Mi rutina' }),
    ).toBeInTheDocument()
  })

  it('un entrenador que entra a /training/:sessionId vuelve al panel', async () => {
    await renderAppAt(trainingPath(SESSION_ID), 'COACH')

    expect(
      await screen.findByRole('heading', { level: 1, name: /Bienvenido/ }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe(paths.dashboard)
  })
})

describe('AppRouter · Progreso (US-26)', () => {
  it('el atleta entra a /progress y la barra muestra "Progreso"', async () => {
    await renderAppAt(paths.progress, 'ATHLETE')

    expect(
      await screen.findByRole('heading', { name: 'Progreso', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Ubicación' }),
    ).toHaveTextContent('Progreso')
    expect(window.location.pathname).toBe(paths.progress)
  })

  it('un entrenador que entra a /progress vuelve al panel', async () => {
    await renderAppAt(paths.progress, 'COACH')

    expect(
      await screen.findByRole('heading', { level: 1, name: /Bienvenido/ }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe(paths.dashboard)
    expect(
      screen.queryByRole('heading', { name: 'Progreso', level: 1 }),
    ).not.toBeInTheDocument()
  })
})

describe('AppRouter · Alimentos (US-39)', () => {
  it.each(['COACH', 'ATHLETE'] as const)(
    '%s entra a /foods y la barra muestra "Alimentos"',
    async (role) => {
      await renderAppAt(paths.foods, role)

      expect(
        await screen.findByRole('heading', { name: 'Alimentos', level: 1 }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('navigation', { name: 'Ubicación' }),
      ).toHaveTextContent('Alimentos')
      expect(
        await screen.findByRole('region', { name: 'Manzana' }),
      ).toBeInTheDocument()
      expect(window.location.pathname).toBe(paths.foods)
    },
  )

  it.each([paths.newFood, foodEditPath('abc')])(
    'un atleta que entra a %s vuelve al panel',
    async (path) => {
      await renderAppAt(path, 'ATHLETE')

      expect(await screen.findByText('Panel del atleta')).toBeInTheDocument()
      expect(window.location.pathname).toBe(paths.dashboard)
    },
  )
})
