import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { saveSession } from '../lib/auth'
import { createMemoryRouter, RouterProvider } from '../lib/navigation'
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

  it('el entrenador ve el acceso a sus atletas, sus rutinas y a los catálogos de ejercicios y alimentos', () => {
    saveSession(session('COACH'))

    renderShell()

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: 'Atletas' })).toHaveAttribute(
      'href',
      paths.athletes,
    )
    expect(within(nav).getByRole('link', { name: 'Rutinas' })).toHaveAttribute(
      'href',
      paths.routines,
    )
    expect(
      within(nav).getByRole('link', { name: 'Ejercicios' }),
    ).toHaveAttribute('href', paths.exercises)
    expect(
      within(nav).getByRole('link', { name: 'Alimentos' }),
    ).toHaveAttribute('href', paths.foods)
    // Mi rutina y Progreso son solo del atleta
    expect(
      within(nav).queryByRole('link', { name: 'Mi rutina' }),
    ).not.toBeInTheDocument()
    expect(
      within(nav).queryByRole('link', { name: 'Progreso' }),
    ).not.toBeInTheDocument()
  })

  it('el atleta ve el acceso a su rutina, a su progreso y al catálogo de alimentos, en ese orden', () => {
    saveSession(session('ATHLETE'))

    renderShell()

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Panel', 'Mi rutina', 'Progreso', 'Alimentos'])
    expect(
      within(nav).getByRole('link', { name: 'Mi rutina' }),
    ).toHaveAttribute('href', paths.myRoutine)
    expect(within(nav).getByRole('link', { name: 'Progreso' })).toHaveAttribute(
      'href',
      paths.progress,
    )
    expect(
      within(nav).getByRole('link', { name: 'Alimentos' }),
    ).toHaveAttribute('href', paths.foods)
  })

  it('el atleta no ve el acceso a atletas, rutinas ni ejercicios', () => {
    saveSession(session('ATHLETE'))

    renderShell()

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(
      within(nav).queryByRole('link', { name: 'Atletas' }),
    ).not.toBeInTheDocument()
    expect(
      within(nav).queryByRole('link', { name: 'Rutinas' }),
    ).not.toBeInTheDocument()
    expect(
      within(nav).queryByRole('link', { name: 'Ejercicios' }),
    ).not.toBeInTheDocument()
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
