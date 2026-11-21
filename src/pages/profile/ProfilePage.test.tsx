import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import { getOwnProfile } from '../../lib/profile/get-own-profile'
import { session } from '../../test/auth-fixtures'
import { ownProfile } from '../../test/own-profile-fixtures'
import { ProfilePage } from './ProfilePage'

vi.mock('../../lib/profile/get-own-profile', () => ({
  getOwnProfile: vi.fn(),
}))

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ProfilePage />
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.mocked(getOwnProfile).mockReset()
  saveSession(session('COACH'))
})

describe('ProfilePage (US-48)', () => {
  it('muestra Mi perfil con sus tres secciones cuando carga el perfil', async () => {
    vi.mocked(getOwnProfile).mockResolvedValue(
      ownProfile({ role: 'COACH', firstName: 'Ana', lastName: 'Pérez' }),
    )

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Datos personales' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Foto de perfil' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Cambiar contraseña' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Mi perfil', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Ana')
  })

  it('si el perfil no carga, avisa y «Reintentar» lo pide otra vez', async () => {
    vi.mocked(getOwnProfile)
      .mockRejectedValueOnce(new ApiError('Caído', 500))
      .mockResolvedValueOnce(ownProfile({ firstName: 'Ana' }))
    const user = userEvent.setup()

    renderPage()

    expect(
      await screen.findByText(
        'No pudimos cargar tu perfil. Intentá nuevamente.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Datos personales' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(
      await screen.findByRole('heading', { name: 'Datos personales' }),
    ).toBeInTheDocument()
    expect(getOwnProfile).toHaveBeenCalledTimes(2)
  })
})
