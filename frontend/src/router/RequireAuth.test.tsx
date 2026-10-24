import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { clearSession, saveSession } from '../lib/auth'
import { session } from '../test/auth-fixtures'
import { paths } from './paths'
import { RequireAuth } from './RequireAuth'

const renderProtectedRoute = () =>
  render(
    <MemoryRouter initialEntries={[paths.dashboard]}>
      <Routes>
        <Route path={paths.login} element={<p>pantalla login</p>} />
        <Route element={<RequireAuth />}>
          <Route path={paths.dashboard} element={<p>pantalla protegida</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('RequireAuth', () => {
  it('sin sesión redirige al login', () => {
    renderProtectedRoute()

    expect(screen.getByText('pantalla login')).toBeInTheDocument()
    expect(screen.queryByText('pantalla protegida')).not.toBeInTheDocument()
  })

  it('con sesión muestra la ruta protegida', () => {
    saveSession(session())

    renderProtectedRoute()

    expect(screen.getByText('pantalla protegida')).toBeInTheDocument()
  })

  it('si la sesión expira mientras está en la pantalla, vuelve al login', () => {
    saveSession(session())
    renderProtectedRoute()

    act(() => clearSession())

    expect(screen.getByText('pantalla login')).toBeInTheDocument()
  })
})
