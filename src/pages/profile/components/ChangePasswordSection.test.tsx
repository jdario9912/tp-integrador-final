import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { changeOwnPassword } from '../../../lib/profile/change-own-password'
import { ChangePasswordSection } from './ChangePasswordSection'

vi.mock('../../../lib/profile/change-own-password', () => ({
  changeOwnPassword: vi.fn(),
}))

const renderSection = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <ChangePasswordSection />
    </QueryClientProvider>,
  )

const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
  repeated: string,
) => {
  await user.type(screen.getByLabelText(/Contraseña actual/), current)
  await user.type(screen.getByLabelText(/^Contraseña nueva/), next)
  await user.type(screen.getByLabelText(/Repetir contraseña nueva/), repeated)
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

beforeEach(() => {
  vi.mocked(changeOwnPassword).mockReset()
})

describe('ChangePasswordSection (US-48)', () => {
  it('valida los tres campos sin llamar a la API', async () => {
    const user = userEvent.setup()
    renderSection()

    await submit(user)

    expect(
      await screen.findByText('Ingresá tu contraseña actual'),
    ).toBeInTheDocument()
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument()
    expect(screen.getByText('Repetí la contraseña nueva')).toBeInTheDocument()
    expect(changeOwnPassword).not.toHaveBeenCalled()
  })

  it('la confirmación debe ser igual a la nueva', async () => {
    const user = userEvent.setup()
    renderSection()

    await fill(user, 'vieja-123', 'nueva-4567', 'otra-4567')
    await submit(user)

    expect(
      await screen.findByText('Las contraseñas no coinciden'),
    ).toBeInTheDocument()
    expect(changeOwnPassword).not.toHaveBeenCalled()
  })

  it('cambia la contraseña enviando la actual y la nueva (no la confirmación) y limpia el formulario', async () => {
    vi.mocked(changeOwnPassword).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderSection()

    await fill(user, 'vieja-123', 'nueva-4567', 'nueva-4567')
    await submit(user)

    expect(changeOwnPassword).toHaveBeenCalledWith({
      currentPassword: 'vieja-123',
      newPassword: 'nueva-4567',
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cambiamos tu contraseña.',
    )
    expect(screen.getByLabelText(/Contraseña actual/)).toHaveValue('')
  })

  it('un 400 de la contraseña actual va a ese campo', async () => {
    vi.mocked(changeOwnPassword).mockRejectedValue(
      new ApiError('Datos inválidos', 400, {
        fieldErrors: [
          {
            field: 'currentPassword',
            message: 'La contraseña actual no es correcta',
          },
        ],
      }),
    )
    const user = userEvent.setup()
    renderSection()

    await fill(user, 'mal-tipeada', 'nueva-4567', 'nueva-4567')
    await submit(user)

    expect(
      await screen.findByText('La contraseña actual no es correcta'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Contraseña actual/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('un 400 de la nueva (igual a la actual, por ejemplo) va a ese campo', async () => {
    vi.mocked(changeOwnPassword).mockRejectedValue(
      new ApiError('Datos inválidos', 400, {
        fieldErrors: [
          {
            field: 'newPassword',
            message: 'La nueva contraseña debe ser distinta de la actual',
          },
        ],
      }),
    )
    const user = userEvent.setup()
    renderSection()

    await fill(user, 'igual-1234', 'igual-1234', 'igual-1234')
    await submit(user)

    expect(
      await screen.findByText(
        'La nueva contraseña debe ser distinta de la actual',
      ),
    ).toBeInTheDocument()
  })

  it('un 400 sin campos muestra el mensaje en el aviso general', async () => {
    vi.mocked(changeOwnPassword).mockRejectedValue(
      new ApiError('La solicitud no es válida', 400),
    )
    const user = userEvent.setup()
    renderSection()

    await fill(user, 'vieja-123', 'nueva-4567', 'nueva-4567')
    await submit(user)

    expect(
      await screen.findByText('La solicitud no es válida'),
    ).toBeInTheDocument()
  })
})
