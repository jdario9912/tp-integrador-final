import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { createCoach } from '../actions/create-coach'
import { RegisterCoachForm } from './RegisterCoachForm'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../actions/create-coach', () => ({ createCoach: vi.fn() }))

const renderForm = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RegisterCoachForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const fillRequiredFields = async () => {
  await userEvent.type(screen.getByLabelText(/Nombre/), '  Ana ')
  await userEvent.type(screen.getByLabelText(/Apellido/), 'Pérez')
  await userEvent.type(screen.getByLabelText(/Email/), 'ana@example.com')
  await userEvent.type(screen.getByLabelText(/Contraseña/), '12345678')
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Registrarme' }))

beforeEach(() => {
  vi.mocked(createCoach).mockReset()
})

describe('RegisterCoachForm', () => {
  it('valida los campos obligatorios sin llamar a la API', async () => {
    renderForm()

    await submit()

    expect(
      await screen.findByText('El nombre es obligatorio'),
    ).toBeInTheDocument()
    expect(screen.getByText('El apellido es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('El email es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(createCoach).not.toHaveBeenCalled()
  })

  it('valida formato de email y largo mínimo de contraseña', async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText(/Email/), 'ana@')
    await userEvent.type(screen.getByLabelText(/Contraseña/), '1234')
    await userEvent.tab()

    expect(await screen.findByText('El email no es válido')).toBeInTheDocument()
    expect(
      screen.getByText('La contraseña debe tener al menos 8 caracteres'),
    ).toBeInTheDocument()
  })

  it('envía los datos normalizados sin los opcionales vacíos', async () => {
    vi.mocked(createCoach).mockResolvedValue({
      id: '1',
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@example.com',
      phone: null,
      specialty: 'Running',
      licenseNumber: null,
      bio: null,
      createdAt: '2026-10-21T17:16:57Z',
    })
    renderForm()

    await fillRequiredFields()
    await userEvent.type(screen.getByLabelText('Especialidad'), 'Running')
    await submit()

    await waitFor(() => expect(createCoach).toHaveBeenCalledOnce())
    expect(vi.mocked(createCoach).mock.calls[0][0]).toEqual({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@example.com',
      password: '12345678',
      specialty: 'Running',
    })
  })

  it('muestra los errores por campo del backend y los limpia al editar', async () => {
    vi.mocked(createCoach).mockRejectedValue(
      new ApiError('La solicitud tiene campos inválidos', 400, {
        fieldErrors: [{ field: 'email', message: 'El email ya está en uso' }],
      }),
    )
    renderForm()

    await fillRequiredFields()
    await submit()

    expect(
      await screen.findByText('El email ya está en uso'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/Email/), 'x')
    expect(
      screen.queryByText('El email ya está en uso'),
    ).not.toBeInTheDocument()
  })

  it('muestra el mensaje general cuando el error no es por campo', async () => {
    vi.mocked(createCoach).mockRejectedValue(
      new ApiError(
        'Ya existe un usuario registrado con el email ana@example.com',
        409,
      ),
    )
    renderForm()

    await fillRequiredFields()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe un usuario registrado con el email ana@example.com',
    )
  })
})
