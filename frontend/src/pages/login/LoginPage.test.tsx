import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { saveSession } from '../../lib/auth'
import { paths } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { LoginPage } from './LoginPage'

const renderAtLogin = (state?: unknown) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[{ pathname: paths.login, state }]}>
        <Routes>
          <Route path={paths.login} element={<LoginPage />} />
          <Route path={paths.dashboard} element={<p>pantalla dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe('LoginPage', () => {
  it('sin sesión muestra el formulario y el acceso al registro', () => {
    renderAtLogin()

    expect(
      screen.getByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registrate' })).toHaveAttribute(
      'href',
      paths.registerCoach,
    )
    // sin un logout fallido no hay aviso
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('con sesión va directo al dashboard', () => {
    saveSession(session())

    renderAtLogin()

    expect(screen.getByText('pantalla dashboard')).toBeInTheDocument()
  })

  it('muestra el aviso solo si el logout no se pudo confirmar', () => {
    renderAtLogin({ logoutFailed: true })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Cerraste sesión en este dispositivo, pero no pudimos confirmarlo con el servidor.',
    )
  })
})
