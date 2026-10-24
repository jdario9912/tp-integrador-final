import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { getSession } from '../../../lib/auth'
import { authResponse } from '../../../test/auth-fixtures'
import { login } from '../actions/login'
import { LoginForm } from './LoginForm'

vi.mock('../actions/login', () => ({ login: vi.fn() }))

const renderForm = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <LoginForm />
    </QueryClientProvider>,
  )
}

const fillCredentials = async (email = 'ana@example.com', password = 'x') => {
  await userEvent.type(screen.getByLabelText(/Email/), email)
  await userEvent.type(screen.getByLabelText(/Contraseña/), password)
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

beforeEach(() => {
  vi.mocked(login).mockReset()
})

describe('LoginForm', () => {
  it('valida los campos obligatorios sin llamar a la API', async () => {
    renderForm()

    await submit()

    expect(
      await screen.findByText('El email es obligatorio'),
    ).toBeInTheDocument()
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(login).not.toHaveBeenCalled()
  })

  it('valida el formato del email', async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText(/Email/), 'ana@')
    await userEvent.tab()

    expect(await screen.findByText('El email no es válido')).toBeInTheDocument()
  })

  it('no exige un largo mínimo de contraseña para ingresar', async () => {
    vi.mocked(login).mockResolvedValue(authResponse())
    renderForm()

    await fillCredentials('ana@example.com', '123')
    await submit()

    await waitFor(() => expect(login).toHaveBeenCalledOnce())
  })

  it('envía el email sin espacios y la contraseña tal cual, y guarda la sesión', async () => {
    vi.mocked(login).mockResolvedValue(authResponse())
    renderForm()

    await fillCredentials('  ana@example.com ', ' clave con espacios ')
    await submit()

    await waitFor(() => expect(login).toHaveBeenCalledOnce())
    expect(vi.mocked(login).mock.calls[0][0]).toEqual({
      email: 'ana@example.com',
      password: ' clave con espacios ',
    })
    await waitFor(() => expect(getSession()).not.toBeNull())
  })

  it.each([
    ['credenciales inválidas', 401, 'Email o contraseña incorrectos'],
    ['cuenta desactivada', 403, 'Tu cuenta está desactivada'],
    ['servidor caído', 0, 'No se pudo conectar con el servidor'],
  ])('muestra el mensaje del backend con %s', async (_, status, message) => {
    vi.mocked(login).mockRejectedValue(new ApiError(message, status))
    renderForm()

    await fillCredentials()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(getSession()).toBeNull()
  })

  it('muestra los errores por campo de un 400', async () => {
    vi.mocked(login).mockRejectedValue(
      new ApiError('La solicitud tiene campos inválidos', 400, {
        fieldErrors: [
          { field: 'email', message: 'El email no tiene un formato válido' },
        ],
      }),
    )
    renderForm()

    await fillCredentials()
    await submit()

    expect(
      await screen.findByText('El email no tiene un formato válido'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra un mensaje genérico ante un error inesperado', async () => {
    vi.mocked(login).mockRejectedValue(new Error('boom'))
    renderForm()

    await fillCredentials()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado. Intentá nuevamente.',
    )
  })
})
