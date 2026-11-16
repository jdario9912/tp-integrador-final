import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { putSessionReview } from '../../../lib/training-sessions/put-session-review'
import { session } from '../../../test/auth-fixtures'
import { trainingSession } from '../../../test/training-session-fixtures'
import { CoachReviewForm } from './CoachReviewForm'

vi.mock('../../../lib/training-sessions/put-session-review', () => ({
  putSessionReview: vi.fn(),
}))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'

const finished = trainingSession({
  status: 'FINISHED',
  endedAt: '2026-11-11T23:02:47.104812Z',
})

const renderForm = (overrides: Parameters<typeof trainingSession>[0] = {}) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const session = trainingSession({ ...finished, ...overrides })
  render(
    <QueryClientProvider client={client}>
      <CoachReviewForm athleteId={ATHLETE_ID} session={session} />
    </QueryClientProvider>,
  )
  return session
}

beforeEach(() => {
  vi.mocked(putSessionReview).mockReset()
  saveSession(session('COACH'))
})

describe('CoachReviewForm (US-21)', () => {
  it('una sesión cancelada no se revisa: avisa y no muestra el formulario', () => {
    renderForm({ status: 'CANCELLED', endedAt: '2026-11-11T23:02:47Z' })

    expect(
      screen.getByText(/Solo se pueden revisar los entrenamientos finalizados/),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Observación')).not.toBeInTheDocument()
  })

  it('sin revisión, el botón marca la sesión como revisada y envía la observación recortada', async () => {
    const user = userEvent.setup()
    vi.mocked(putSessionReview).mockResolvedValue(
      trainingSession({
        status: 'FINISHED',
        review: {
          reviewedAt: '2026-11-14T20:00:00Z',
          observation: 'Buen ritmo',
        },
      }),
    )
    renderForm()

    expect(screen.getByText('Todavía no está revisado.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Observación'), '  Buen ritmo  ')
    await user.click(
      screen.getByRole('button', { name: 'Marcar como revisada' }),
    )

    expect(
      await screen.findByText('Marcaste el entrenamiento como revisado.'),
    ).toBeInTheDocument()
    expect(putSessionReview).toHaveBeenCalledWith(ATHLETE_ID, finished.id, {
      observation: 'Buen ritmo',
    })
  })

  it('sin texto no manda observación', async () => {
    const user = userEvent.setup()
    vi.mocked(putSessionReview).mockResolvedValue(finished)
    renderForm()

    await user.click(
      screen.getByRole('button', { name: 'Marcar como revisada' }),
    )

    await waitFor(() => expect(putSessionReview).toHaveBeenCalledTimes(1))
    expect(putSessionReview).toHaveBeenCalledWith(ATHLETE_ID, finished.id, {
      observation: undefined,
    })
  })

  it('una revisión existente se edita con la observación actual y reemplaza', async () => {
    const user = userEvent.setup()
    vi.mocked(putSessionReview).mockResolvedValue(finished)
    renderForm({
      review: {
        reviewedAt: '2026-11-13T20:00:00Z',
        observation: 'Revisar la técnica',
      },
    })

    expect(screen.getByText(/Revisado el/)).toBeInTheDocument()
    const field = screen.getByLabelText('Observación')
    expect(field).toHaveValue('Revisar la técnica')
    await user.clear(field)
    await user.type(field, 'Mejoró mucho')
    await user.click(screen.getByRole('button', { name: 'Guardar revisión' }))

    expect(
      await screen.findByText('Guardaste los cambios de la revisión.'),
    ).toBeInTheDocument()
    expect(putSessionReview).toHaveBeenCalledWith(ATHLETE_ID, finished.id, {
      observation: 'Mejoró mucho',
    })
  })

  it('un error del servidor (422) se muestra tal cual', async () => {
    const user = userEvent.setup()
    vi.mocked(putSessionReview).mockRejectedValue(
      new ApiError(
        'La sesión de entrenamiento todavía no está finalizada',
        422,
      ),
    )
    renderForm()

    await user.click(
      screen.getByRole('button', { name: 'Marcar como revisada' }),
    )

    expect(
      await screen.findByText(
        'La sesión de entrenamiento todavía no está finalizada',
      ),
    ).toBeInTheDocument()
  })

  it('muestra el contador de caracteres del límite de 1000', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Observación'), 'abcd')

    expect(screen.getByText(/Escritas: 4 de 1000\./)).toBeInTheDocument()
  })
})
