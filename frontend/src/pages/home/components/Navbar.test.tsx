import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { saveSession } from '../../../lib/auth'
import { paths } from '../../../router/paths'
import { session } from '../../../test/auth-fixtures'
import { Navbar } from './Navbar'

const renderNavbar = () =>
  render(
    <MemoryRouter initialEntries={[paths.home]}>
      <Routes>
        <Route path={paths.home} element={<Navbar />} />
        <Route path={paths.login} element={<p>pantalla login</p>} />
        <Route path={paths.dashboard} element={<p>pantalla dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  )

describe('Navbar', () => {
  it('sin sesión ofrece iniciar sesión', async () => {
    renderNavbar()

    await userEvent.click(
      screen.getByRole('button', { name: 'Iniciar sesión' }),
    )

    expect(screen.getByText('pantalla login')).toBeInTheDocument()
  })

  it('con sesión lleva al dashboard', async () => {
    saveSession(session())
    renderNavbar()

    await userEvent.click(screen.getByRole('button', { name: 'Dashboard' }))

    expect(screen.getByText('pantalla dashboard')).toBeInTheDocument()
  })
})
