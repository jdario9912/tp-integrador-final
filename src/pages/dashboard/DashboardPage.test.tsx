import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../../lib/auth'
import { paths } from '../../router/paths'
import { getCurrentUser } from '../../lib/auth/get-current-user'
import { authResponse, session } from '../../test/auth-fixtures'
import { DashboardPage } from './DashboardPage'

vi.mock('../../lib/auth/get-current-user', () => ({
  getCurrentUser: vi.fn(),
}))

const renderPage = (state?: unknown) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[{ pathname: paths.dashboard, state }]}>
        <Routes>
          <Route path={paths.dashboard} element={<DashboardPage />} />
          <Route path={paths.newAthlete} element={<p>pantalla alta</p>} />
        </Routes>
      </MemoryRouter>
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
      screen.getByRole('heading', { name: '¡Bienvenido de nuevo, Ana!' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Esto es lo que está pasando hoy con tus atletas.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Panel del atleta')).not.toBeInTheDocument()
  })

  it('muestra el panel del atleta a un atleta', () => {
    saveSession(session('ATHLETE'))
    vi.mocked(getCurrentUser).mockResolvedValue(authResponse('ATHLETE').user)

    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Hola, Leo')).toBeInTheDocument()
    expect(screen.getByText('Panel del atleta')).toBeInTheDocument()
    expect(screen.queryByText(/Bienvenido de nuevo/)).not.toBeInTheDocument()
  })

  it('saluda con el nombre de la sesión y lo actualiza con GET /auth/me', async () => {
    saveSession(session('COACH'))
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...authResponse('COACH').user,
      firstName: 'Anabel',
    })

    renderPage()

    expect(
      screen.getByRole('heading', { name: '¡Bienvenido de nuevo, Ana!' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', {
        name: '¡Bienvenido de nuevo, Anabel!',
      }),
    ).toBeInTheDocument()
  })

  it('el entrenador puede ir a agregar un atleta', async () => {
    saveSession(session('COACH'))
    vi.mocked(getCurrentUser).mockResolvedValue(authResponse('COACH').user)

    renderPage()
    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar atleta' }),
    )

    expect(screen.getByText('pantalla alta')).toBeInTheDocument()
  })

  it('el atleta no ve la acción de agregar atletas', () => {
    saveSession(session('ATHLETE'))
    vi.mocked(getCurrentUser).mockResolvedValue(authResponse('ATHLETE').user)

    renderPage()

    expect(
      screen.queryByRole('button', { name: 'Agregar atleta' }),
    ).not.toBeInTheDocument()
  })

  it('avisa que se creó el atleta solo si lo indica la navegación', () => {
    saveSession(session('COACH'))
    vi.mocked(getCurrentUser).mockResolvedValue(authResponse('COACH').user)

    renderPage({ createdAthlete: 'Juana Pérez' })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Creaste a Juana Pérez. Ya puede ingresar con su email y la contraseña que le asignaste.',
    )
  })

  it('sin un alta reciente no muestra el aviso', () => {
    saveSession(session('COACH'))
    vi.mocked(getCurrentUser).mockResolvedValue(authResponse('COACH').user)

    renderPage()

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
