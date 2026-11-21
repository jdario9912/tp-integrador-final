import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveSession, type Role } from '../lib/auth'
import { authResponse, session } from '../test/auth-fixtures'
import { createdFood, foodsPage } from '../test/food-fixtures'
import { SESSION_ID, trainingSession } from '../test/training-session-fixtures'
import { weightsPage } from '../test/weight-fixtures'
import { emptyDailySummary } from '../test/daily-summary-fixtures' // US-24
import { ownProfile } from '../test/own-profile-fixtures' // US-48
import { getTrainingHistory } from '../lib/training-sessions/get-training-history'
import { foodEditPath, paths, trainingPath } from './paths'

vi.mock('../lib/auth/get-current-user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('../lib/weights/get-weights', () => ({ getWeights: vi.fn() }))
// historial de entrenamientos (US-21)
vi.mock('../lib/training-sessions/get-training-history', () => ({
  getTrainingHistory: vi.fn(),
}))
vi.mock('../lib/athlete-routine/get-athlete-routine', () => ({
  getAthleteRoutine: vi.fn(),
}))
vi.mock('../lib/exercises/get-muscle-groups', () => ({
  getMuscleGroups: vi.fn(),
}))
vi.mock('../pages/foods/actions/get-foods', () => ({ getFoods: vi.fn() }))
// US-23: comidas del día
vi.mock('../lib/meals/get-meals', () => ({ getMealsOfDay: vi.fn() }))
// US-24: resumen nutricional del día (bloque propio)
vi.mock('../pages/meals/actions/get-daily-summary', () => ({
  getDailyNutritionSummary: vi.fn(),
}))
// US-48: perfil propio (menú de usuario y Mi perfil) (bloque propio)
vi.mock('../lib/profile/get-own-profile', () => ({ getOwnProfile: vi.fn() }))
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
  // US-23: comidas del día
  const { getMealsOfDay } = await import('../lib/meals/get-meals')
  vi.mocked(getMealsOfDay).mockResolvedValue([])
  // US-24: resumen del día (bloque propio)
  const { getDailyNutritionSummary } =
    await import('../pages/meals/actions/get-daily-summary')
  vi.mocked(getDailyNutritionSummary).mockResolvedValue(emptyDailySummary())
  const { getInProgressSession } =
    await import('../lib/training-sessions/get-in-progress-session')
  vi.mocked(getInProgressSession).mockResolvedValue(null)
  const { getTrainingSession } =
    await import('../lib/training-sessions/get-training-session')
  vi.mocked(getTrainingSession).mockResolvedValue(trainingSession())
  // US-48: perfil propio (bloque propio)
  const { getOwnProfile } = await import('../lib/profile/get-own-profile')
  vi.mocked(getOwnProfile).mockResolvedValue(ownProfile())
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

// US-48: Mi perfil lo usan los dos roles (bloque propio)
describe('AppRouter · Mi perfil (US-48)', () => {
  it.each(['COACH', 'ATHLETE'] as const)(
    'el %s entra a /profile y la barra muestra "Mi perfil"',
    async (role) => {
      await renderAppAt(paths.profile, role)

      expect(
        await screen.findByRole('heading', { name: 'Mi perfil', level: 1 }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('navigation', { name: 'Ubicación' }),
      ).toHaveTextContent('Mi perfil')
      expect(window.location.pathname).toBe(paths.profile)
    },
    // importar el router de nuevo (resetModules) tarda más que el límite global con la suite llena
    15_000,
  )
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
      // exacto: «Entrenamientos» (US-21) es otra entrada, la del historial
      within(menu).queryByRole('link', { name: 'Entrenamiento' }),
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

// US-23: el atleta entra a Comidas desde su menú; un entrenador que llega ahí vuelve al panel
describe('AppRouter · Comidas (US-23)', () => {
  it('el atleta entra a /meals y la barra muestra "Comidas"', async () => {
    await renderAppAt(paths.meals, 'ATHLETE')

    expect(
      await screen.findByRole('heading', { name: 'Comidas', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Ubicación' }),
    ).toHaveTextContent('Comidas')
    expect(window.location.pathname).toBe(paths.meals)
  })

  it('un entrenador que entra a /meals vuelve al panel', async () => {
    await renderAppAt(paths.meals, 'COACH')

    expect(
      await screen.findByRole('heading', { level: 1, name: /Bienvenido/ }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe(paths.dashboard)
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

      expect(
        await screen.findByRole('region', { name: 'Entrenamiento de hoy' }),
      ).toBeInTheDocument()
      expect(window.location.pathname).toBe(paths.dashboard)
    },
  )
})

describe('AppRouter · Entrenamientos (US-21)', () => {
  it('el atleta entra a /training-history y la barra muestra "Entrenamientos"', async () => {
    vi.mocked(getTrainingHistory).mockResolvedValue({
      content: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
    })

    await renderAppAt(paths.trainingHistory, 'ATHLETE')

    expect(
      await screen.findByRole('heading', { name: 'Entrenamientos', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Ubicación' }),
    ).toHaveTextContent('Entrenamientos')
    expect(window.location.pathname).toBe(paths.trainingHistory)
  })
})
