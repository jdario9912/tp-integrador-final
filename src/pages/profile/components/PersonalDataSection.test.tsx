import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { updateOwnProfile } from '../../../lib/profile/update-own-profile'
import { session } from '../../../test/auth-fixtures'
import { ownProfile } from '../../../test/own-profile-fixtures'
import { EMAIL_TAKEN_MESSAGE } from '../messages'
import { PersonalDataSection } from './PersonalDataSection'

vi.mock('../../../lib/profile/update-own-profile', () => ({
  updateOwnProfile: vi.fn(),
}))

const renderSection = (profile = ownProfile()) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <PersonalDataSection profile={profile} />
    </QueryClientProvider>,
  )

const submit = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Guardar datos' }))

beforeEach(() => {
  vi.mocked(updateOwnProfile).mockReset()
  saveSession(session('ATHLETE'))
})

describe('PersonalDataSection (US-48)', () => {
  // topes del contrato (18.4): se avisan antes de enviar
  it('avisa si el nombre supera los 100 caracteres, sin llamar a la API', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.clear(screen.getByLabelText(/Nombre/))
    await user.type(screen.getByLabelText(/Nombre/), 'a'.repeat(101))
    await submit(user)

    expect(
      await screen.findByText('El nombre no puede superar los 100 caracteres'),
    ).toBeInTheDocument()
    expect(updateOwnProfile).not.toHaveBeenCalled()
  })

  it('el teléfono es opcional: no lleva asterisco de obligatorio', () => {
    renderSection()

    expect(screen.getByLabelText(/Teléfono/)).toHaveAccessibleName('Teléfono')
    expect(screen.getByLabelText(/Nombre/)).toHaveAccessibleName(/Nombre/)
  })

  it('muestra los datos actuales en los campos', () => {
    renderSection(ownProfile({ phone: '11 5555 1234' }))

    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Leo')
    expect(screen.getByLabelText(/Apellido/)).toHaveValue('Gil')
    expect(screen.getByLabelText(/Email/)).toHaveValue('leo@example.com')
    expect(screen.getByLabelText(/Teléfono/)).toHaveValue('11 5555 1234')
  })

  it('no llama a la API si falta un dato obligatorio', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.clear(screen.getByLabelText(/Nombre/))
    await submit(user)

    expect(
      await screen.findByText('El nombre es obligatorio'),
    ).toBeInTheDocument()
    expect(updateOwnProfile).not.toHaveBeenCalled()
  })

  it('guarda los datos sin espacios y confirma; el teléfono vacío viaja como null', async () => {
    vi.mocked(updateOwnProfile).mockResolvedValue(
      ownProfile({ firstName: 'Leonel', email: 'nuevo@example.com' }),
    )
    const user = userEvent.setup()
    renderSection()

    await user.clear(screen.getByLabelText(/Nombre/))
    await user.type(screen.getByLabelText(/Nombre/), '  Leonel ')
    await user.clear(screen.getByLabelText(/Email/))
    await user.type(screen.getByLabelText(/Email/), 'nuevo@example.com')
    await submit(user)

    expect(updateOwnProfile).toHaveBeenCalledWith({
      firstName: 'Leonel',
      lastName: 'Gil',
      email: 'nuevo@example.com',
      phone: null,
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Guardamos tus datos.',
    )
  })

  it('un 409 marca el campo email con el aviso de email en uso', async () => {
    vi.mocked(updateOwnProfile).mockRejectedValue(
      new ApiError('Ese email ya existe', 409),
    )
    const user = userEvent.setup()
    renderSection()

    await submit(user)

    expect(await screen.findByText(EMAIL_TAKEN_MESSAGE)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('un 400 con campo va a ese campo', async () => {
    vi.mocked(updateOwnProfile).mockRejectedValue(
      new ApiError('Datos inválidos', 400, {
        fieldErrors: [
          { field: 'lastName', message: 'El apellido es muy largo' },
        ],
      }),
    )
    const user = userEvent.setup()
    renderSection()

    await submit(user)

    expect(
      await screen.findByText('El apellido es muy largo'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Apellido/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('un error del servidor sin campos muestra su mensaje en el aviso general', async () => {
    vi.mocked(updateOwnProfile).mockRejectedValue(
      new ApiError('No pudimos guardar tus datos', 500),
    )
    const user = userEvent.setup()
    renderSection()

    await submit(user)

    expect(
      await screen.findByText('No pudimos guardar tus datos'),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Guardar datos' }),
      ).toBeEnabled(),
    )
  })
})
