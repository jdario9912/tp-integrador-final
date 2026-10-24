import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { saveSession, type Role } from '../lib/auth'
import { session } from '../test/auth-fixtures'
import { paths } from './paths'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'

const ROLE_ROUTE = '/solo-para-un-rol'

const renderRoleRoute = (roles: Role[] = ['COACH']) =>
  render(
    <MemoryRouter initialEntries={[ROLE_ROUTE]}>
      <Routes>
        <Route path={paths.login} element={<p>pantalla login</p>} />
        <Route element={<RequireAuth />}>
          <Route path={paths.dashboard} element={<p>pantalla dashboard</p>} />
          <Route element={<RequireRole roles={roles} />}>
            <Route path={ROLE_ROUTE} element={<p>pantalla del rol</p>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('RequireRole', () => {
  it('con el rol permitido muestra la ruta', () => {
    saveSession(session('COACH'))

    renderRoleRoute()

    expect(screen.getByText('pantalla del rol')).toBeInTheDocument()
  })

  it('con otro rol redirige al dashboard', () => {
    saveSession(session('ATHLETE'))

    renderRoleRoute()

    expect(screen.getByText('pantalla dashboard')).toBeInTheDocument()
    expect(screen.queryByText('pantalla del rol')).not.toBeInTheDocument()
  })

  it('acepta más de un rol', () => {
    saveSession(session('ATHLETE'))

    renderRoleRoute(['COACH', 'ATHLETE'])

    expect(screen.getByText('pantalla del rol')).toBeInTheDocument()
  })

  it('sin sesión redirige al login', () => {
    renderRoleRoute()

    expect(screen.getByText('pantalla login')).toBeInTheDocument()
    expect(screen.queryByText('pantalla del rol')).not.toBeInTheDocument()
  })

  // ej. en otra pestaña se inicia sesión con un usuario de otro rol
  it('si la sesión pasa a otro rol mientras está en la pantalla, redirige', () => {
    saveSession(session('COACH'))
    renderRoleRoute()

    act(() => saveSession(session('ATHLETE')))

    expect(screen.getByText('pantalla dashboard')).toBeInTheDocument()
  })
})
