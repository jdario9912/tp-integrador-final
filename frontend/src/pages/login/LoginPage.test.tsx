import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { saveSession } from '../../lib/auth'
import { paths } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { LoginPage } from './LoginPage'

const renderAtLogin = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[paths.login]}>
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
  })

  it('con sesión va directo al dashboard', () => {
    saveSession(session())

    renderAtLogin()

    expect(screen.getByText('pantalla dashboard')).toBeInTheDocument()
  })
})
