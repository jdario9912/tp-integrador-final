import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { getSession, saveSession } from '../../lib/auth'
import { MemoryRouter, Route, Routes, useLocation } from '../../lib/navigation'
import { paths } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { resetPassword } from './actions/reset-password'
import { ResetPasswordPage } from './ResetPasswordPage'

vi.mock('./actions/reset-password', () => ({ resetPassword: vi.fn() }))

function LoginProbe() {
  const location = useLocation()
  return <p>pantalla login {JSON.stringify(location.state)}</p>
}

const renderAt = (url: string) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={paths.resetPassword} element={<ResetPasswordPage />} />
          <Route path={paths.login} element={<LoginProbe />} />
          <Route
            path={paths.forgotPassword}
            element={<p>pantalla recuperar</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const fill = async (password: string, confirmation = password) => {
  await userEvent.type(screen.getByLabelText(/Nueva contraseña/), password)
  await userEvent.type(
    screen.getByLabelText(/Repetir contraseña/),
    confirmation,
  )
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

const URL_WITH_TOKEN = `${paths.resetPassword}?token=token-1`

beforeEach(() => {
  vi.mocked(resetPassword).mockReset()
})

describe('ResetPasswordPage (US-44)', () => {
  it('sin token muestra el enlace inválido y no llama a la API', async () => {
    renderAt(paths.resetPassword)

    expect(screen.getByText(/El enlace no es válido/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Nueva contraseña/)).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Solicitar un nuevo enlace' }),
    )
    expect(screen.getByText('pantalla recuperar')).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('valida la política de contraseña y la confirmación antes de enviar', async () => {
    renderAt(URL_WITH_TOKEN)

    await fill('corta', 'otra')
    await submit()

    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres'),
    ).toBeInTheDocument()
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('pide repetir la contraseña', async () => {
    renderAt(URL_WITH_TOKEN)

    await userEvent.type(
      screen.getByLabelText(/Nueva contraseña/),
      'nueva-clave',
    )
    await submit()

    expect(await screen.findByText('Repetí la contraseña')).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('con el 204 cierra la sesión guardada y lleva al login con el aviso', async () => {
    saveSession(session())
    vi.mocked(resetPassword).mockResolvedValue(undefined)
    renderAt(URL_WITH_TOKEN)

    await fill(' nueva clave ')
    await submit()

    expect(
      await screen.findByText(/pantalla login .*"passwordReset":true/),
    ).toBeInTheDocument()
    expect(vi.mocked(resetPassword).mock.calls[0][0]).toEqual({
      token: 'token-1',
      newPassword: ' nueva clave ',
    })
    expect(getSession()).toBeNull()
  })

  it('el 400 de la política va al campo de la contraseña', async () => {
    vi.mocked(resetPassword).mockRejectedValue(
      new ApiError('La solicitud tiene campos inválidos', 400, {
        fieldErrors: [
          {
            field: 'newPassword',
            message: 'La contraseña debe tener entre 8 y 72 bytes',
          },
        ],
      }),
    )
    renderAt(URL_WITH_TOKEN)

    await fill('nueva-clave')
    await submit()

    expect(
      await screen.findByText('La contraseña debe tener entre 8 y 72 bytes'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Nueva contraseña/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('el 400 sin errores por campo (token vencido) ofrece pedir otro enlace', async () => {
    vi.mocked(resetPassword).mockRejectedValue(
      new ApiError('El enlace de recuperación venció o ya fue usado', 400),
    )
    renderAt(URL_WITH_TOKEN)

    await fill('nueva-clave')
    await submit()

    expect(
      await screen.findByText(
        'El enlace de recuperación venció o ya fue usado',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Solicitar un nuevo enlace' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.queryByLabelText(/Nueva contraseña/),
      ).not.toBeInTheDocument(),
    )
  })

  it('un error del servidor se muestra en el aviso y deja reintentar', async () => {
    vi.mocked(resetPassword).mockRejectedValue(
      new ApiError('No se pudo conectar con el servidor', 0),
    )
    renderAt(URL_WITH_TOKEN)

    await fill('nueva-clave')
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    expect(
      screen.getByRole('button', { name: 'Guardar contraseña' }),
    ).toBeEnabled()
  })
})
