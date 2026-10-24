import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { session } from '../../../test/auth-fixtures'
import { saveSession } from '../../../lib/auth'
import { useLogout } from '../../../lib/auth/use-logout'
import { UserCard } from './UserCard'

vi.mock('../../../lib/auth/use-logout', () => ({ useLogout: vi.fn() }))

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
})

describe('UserCard', () => {
  it('muestra iniciales, nombre y rol del entrenador', () => {
    saveSession(session('COACH'))

    render(<UserCard />)

    expect(screen.getByText('AP')).toBeInTheDocument()
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Entrenador')).toBeInTheDocument()
  })

  it('muestra iniciales, nombre y rol del atleta', () => {
    saveSession(session('ATHLETE'))

    render(<UserCard />)

    expect(screen.getByText('LG')).toBeInTheDocument()
    expect(screen.getByText('Leo Gil')).toBeInTheDocument()
    expect(screen.getByText('Atleta')).toBeInTheDocument()
  })

  it('el botón dispara el cierre de sesión', async () => {
    saveSession(session())
    const user = userEvent.setup()

    render(<UserCard />)
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('deshabilita el botón mientras el logout está pendiente', () => {
    saveSession(session())
    mockLogout(true)

    render(<UserCard />)

    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeDisabled()
  })
})
