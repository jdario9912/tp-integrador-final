import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../../lib/auth'
import { getCurrentUser } from '../../lib/auth/get-current-user'
import { authResponse, session } from '../../test/auth-fixtures'
import { DashboardPage } from './DashboardPage'

vi.mock('../../lib/auth/get-current-user', () => ({
  getCurrentUser: vi.fn(),
}))

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <DashboardPage />
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.mocked(getCurrentUser).mockReset()
})

describe('DashboardPage', () => {
  it('muestra el panel del entrenador a un entrenador', async () => {
    saveSession(session('COACH'))
    vi.mocked(getCurrentUser).mockResolvedValue(authResponse('COACH').user)

    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Panel del entrenador')).toBeInTheDocument()
    expect(screen.queryByText('Panel del atleta')).not.toBeInTheDocument()
  })

  it('muestra el panel del atleta a un atleta', () => {
    saveSession(session('ATHLETE'))
    vi.mocked(getCurrentUser).mockResolvedValue(authResponse('ATHLETE').user)

    renderPage()

    expect(screen.getByText('Panel del atleta')).toBeInTheDocument()
    expect(screen.queryByText('Panel del entrenador')).not.toBeInTheDocument()
  })

  it('saluda con el nombre de la sesión y lo actualiza con GET /auth/me', async () => {
    saveSession(session('COACH'))
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...authResponse('COACH').user,
      firstName: 'Anabel',
    })

    renderPage()

    expect(screen.getByText('Hola, Ana')).toBeInTheDocument()
    expect(await screen.findByText('Hola, Anabel')).toBeInTheDocument()
  })
})
