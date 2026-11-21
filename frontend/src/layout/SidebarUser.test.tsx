import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { session } from '../test/auth-fixtures'
import { saveSession } from '../lib/auth'
import { useLogout } from '../lib/auth/use-logout'
import { MemoryRouter } from '../lib/navigation'
import { getOwnProfile } from '../lib/profile/get-own-profile' // US-48
import { ownProfile } from '../test/own-profile-fixtures' // US-48
import { SidebarUser } from './SidebarUser'

vi.mock('../lib/auth/use-logout', () => ({ useLogout: vi.fn() }))
// US-48: el avatar consulta el perfil propio
vi.mock('../lib/profile/get-own-profile', () => ({ getOwnProfile: vi.fn() }))

// el avatar consulta el perfil propio (US-48): hacen falta el cliente de consultas y el router
const renderSidebarUser = (onNavigate?: () => void) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <SidebarUser onNavigate={onNavigate} />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const mutate = vi.fn()

const mockLogout = (isPending = false) => {
  vi.mocked(useLogout).mockReturnValue({
    mutate,
    isPending,
  } as unknown as ReturnType<typeof useLogout>)
}

beforeEach(() => {
  mutate.mockReset()
  mockLogout()
  // US-48: sin foto por defecto (muestra las iniciales)
  vi.mocked(getOwnProfile).mockResolvedValue(ownProfile())
})

describe('SidebarUser', () => {
  it('muestra iniciales, nombre y rol del entrenador', () => {
    saveSession(session('COACH'))

    renderSidebarUser()

    expect(screen.getByText('AP')).toBeInTheDocument()
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Entrenador')).toBeInTheDocument()
  })

  it('muestra iniciales, nombre y rol del atleta', () => {
    saveSession(session('ATHLETE'))

    renderSidebarUser()

    expect(screen.getByText('LG')).toBeInTheDocument()
    expect(screen.getByText('Leo Gil')).toBeInTheDocument()
    expect(screen.getByText('Atleta')).toBeInTheDocument()
  })

  it('el botón dispara el cierre de sesión', async () => {
    saveSession(session())
    const user = userEvent.setup()

    renderSidebarUser()
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('deshabilita el botón mientras el logout está pendiente', () => {
    saveSession(session())
    mockLogout(true)

    renderSidebarUser()

    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeDisabled()
  })

  // US-48: con foto vigente, el avatar muestra la imagen
  it('muestra la foto de perfil cuando hay una vigente', async () => {
    saveSession(session('ATHLETE'))
    vi.mocked(getOwnProfile).mockResolvedValue(
      ownProfile({
        photoUrl: 'https://storage.example.test/perfil.png?token=ok',
        photoUrlExpiresAt: '2099-01-01T00:00:00Z',
      }),
    )

    renderSidebarUser()

    expect(await screen.findByRole('img', { name: 'Leo Gil' })).toHaveAttribute(
      'src',
      'https://storage.example.test/perfil.png?token=ok',
    )
  })

  // US-48: el bloque de la cuenta lleva a Mi perfil y avisa al panel móvil
  it('el bloque de la cuenta lleva a Mi perfil y avisa que se navegó', async () => {
    saveSession(session())
    const onNavigate = vi.fn()
    const user = userEvent.setup()

    renderSidebarUser(onNavigate)
    await user.click(screen.getByRole('link', { name: /Mi perfil/ }))

    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})
