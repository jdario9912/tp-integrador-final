import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { saveSession } from '../lib/auth'
import { paths } from '../router/paths'
import { session } from '../test/auth-fixtures'
import { AppShell } from './AppShell'

vi.mock('../lib/auth/use-logout', () => ({
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}))

const renderShell = () =>
  render(
    <RouterProvider
      router={createMemoryRouter(
        [
          {
            element: <AppShell />,
            children: [
              {
                path: paths.dashboard,
                element: <p>contenido</p>,
                handle: { title: 'Panel' },
              },
            ],
          },
        ],
        { initialEntries: [paths.dashboard] },
      )}
    />,
  )

describe('AppShell', () => {
  it('muestra la navegación, la ubicación y el contenido de la ruta', () => {
    saveSession(session('COACH'))

    renderShell()

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Panel' }))
    expect(screen.getByRole('link', { name: 'Panel' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getByRole('navigation', { name: 'Ubicación' }),
    ).toHaveTextContent('Panel')
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })

  it('abre el menú en móvil y lo cierra con Escape', async () => {
    saveSession(session('ATHLETE'))
    const user = userEvent.setup()

    renderShell()
    const toggle = screen.getByRole('button', { name: 'Abrir menú' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})
