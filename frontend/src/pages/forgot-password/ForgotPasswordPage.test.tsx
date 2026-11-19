import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import { MemoryRouter, Route, Routes } from '../../lib/navigation'
import { paths } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { requestPasswordRecovery } from './actions/request-password-recovery'
import { ForgotPasswordPage } from './ForgotPasswordPage'

vi.mock('./actions/request-password-recovery', () => ({
  requestPasswordRecovery: vi.fn(),
}))

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[paths.forgotPassword]}>
        <Routes>
          <Route path={paths.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={paths.dashboard} element={<p>pantalla dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const submitEmail = async (email: string) => {
  await userEvent.type(screen.getByLabelText(/Email/), email)
  await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
}

beforeEach(() => {
  vi.mocked(requestPasswordRecovery).mockReset()
})

describe('ForgotPasswordPage (US-44)', () => {
  it('valida el email sin llamar a la API', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(
      await screen.findByText('El email es obligatorio'),
    ).toBeInTheDocument()
    expect(requestPasswordRecovery).not.toHaveBeenCalled()
  })

  it('con el 202 muestra una confirmación neutra con el vencimiento', async () => {
    vi.mocked(requestPasswordRecovery).mockResolvedValue(undefined)
    renderPage()

    await submitEmail('  ana@example.com ')

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si ana@example.com está registrado, te enviamos un enlace para crear una contraseña nueva. Vence en 30 minutos.',
    )
    expect(vi.mocked(requestPasswordRecovery).mock.calls[0][0]).toEqual({
      email: 'ana@example.com',
    })
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Volver a iniciar sesión/ }),
    ).toHaveAttribute('href', paths.login)
  })

  it('desde la confirmación reenvía el enlace al mismo email', async () => {
    vi.mocked(requestPasswordRecovery).mockResolvedValue(undefined)
    renderPage()
    await submitEmail('ana@example.com')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Reenviar enlace' }),
    )

    expect(
      await screen.findByText('Te enviamos un enlace nuevo.'),
    ).toBeInTheDocument()
    expect(requestPasswordRecovery).toHaveBeenCalledTimes(2)
    expect(vi.mocked(requestPasswordRecovery).mock.calls[1][0]).toEqual({
      email: 'ana@example.com',
    })
  })

  it('"Usar otro email" vuelve al formulario', async () => {
    vi.mocked(requestPasswordRecovery).mockResolvedValue(undefined)
    renderPage()
    await submitEmail('ana@example.com')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Usar otro email' }),
    )

    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
  })

  it('con el 503 muestra el mensaje del backend y deja reintentar', async () => {
    vi.mocked(requestPasswordRecovery).mockRejectedValue(
      new ApiError('No pudimos enviar el email. Intentá más tarde.', 503),
    )
    renderPage()

    await submitEmail('ana@example.com')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos enviar el email. Intentá más tarde.',
    )
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeEnabled()
  })

  it('muestra en el campo el error de validación del backend', async () => {
    vi.mocked(requestPasswordRecovery).mockRejectedValue(
      new ApiError('La solicitud tiene campos inválidos', 400, {
        fieldErrors: [{ field: 'email', message: 'El email no es válido' }],
      }),
    )
    renderPage()

    await submitEmail('ana@example.com')

    await waitFor(() =>
      expect(screen.getByLabelText(/Email/)).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    )
    expect(screen.getByText('El email no es válido')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('con sesión va al dashboard', () => {
    saveSession(session())

    renderPage()

    expect(screen.getByText('pantalla dashboard')).toBeInTheDocument()
  })
})
