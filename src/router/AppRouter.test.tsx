import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveSession, type Role } from '../lib/auth'
import { authResponse, session } from '../test/auth-fixtures'
import { createdFood, foodsPage } from '../test/food-fixtures'
import { weightsPage } from '../test/weight-fixtures'
import { foodEditPath, paths } from './paths'

vi.mock('../lib/auth/get-current-user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('../lib/weights/get-weights', () => ({ getWeights: vi.fn() }))
vi.mock('../pages/foods/actions/get-foods', () => ({ getFoods: vi.fn() }))

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
  const { getFoods } = await import('../pages/foods/actions/get-foods')
  vi.mocked(getFoods).mockResolvedValue(foodsPage([createdFood()]))
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
