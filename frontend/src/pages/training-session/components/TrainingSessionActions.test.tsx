import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { cancelTrainingSession } from '../../../lib/training-sessions/cancel-training-session'
import { finishTrainingSession } from '../../../lib/training-sessions/finish-training-session'
import { session } from '../../../test/auth-fixtures'
import { trainingSession } from '../../../test/training-session-fixtures'
import { TrainingSessionActions } from './TrainingSessionActions'

vi.mock('../../../lib/training-sessions/finish-training-session', () => ({
  finishTrainingSession: vi.fn(),
}))
vi.mock('../../../lib/training-sessions/cancel-training-session', () => ({
  cancelTrainingSession: vi.fn(),
}))

const ATHLETE_ID = session('ATHLETE').user.id

// una serie hecha de tres prescritas en el día de prueba (7 series en total)
const withDoneSets = trainingSession({
  summary: {
    prescribedSets: 7,
    doneSets: 3,
    skippedSets: 0,
    pendingSets: 4,
    volumeKg: 500,
  },
})

const renderActions = (current = withDoneSets) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <TrainingSessionActions athleteId={ATHLETE_ID} session={current} />
    </QueryClientProvider>,
  )
}

const dialogNamed = (name: string) => screen.getByRole('dialog', { name })

beforeEach(() => {
  vi.mocked(finishTrainingSession).mockReset()
  vi.mocked(cancelTrainingSession).mockReset()
  saveSession(session('ATHLETE'))
})

describe('TrainingSessionActions (US-20)', () => {
  it('muestra el avance y las dos acciones', () => {
    renderActions()

    expect(screen.getByText('Llevás 3 de 7 series hechas.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Finalizar entrenamiento' }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: 'Cancelar entrenamiento' }),
    ).toBeEnabled()
  })

  it('finalizar pide confirmación y, al confirmar, finaliza la sesión', async () => {
    vi.mocked(finishTrainingSession).mockResolvedValue(
      trainingSession({ status: 'FINISHED' }),
    )
    renderActions()

    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar entrenamiento' }),
    )
    const dialog = dialogNamed('¿Finalizar el entrenamiento?')
    expect(
      within(dialog).getByText(/Se guardan 3 series hechas/),
    ).toBeInTheDocument()
    // sin series hechas no se sugiere cancelar: finalizar es la opción normal
    expect(
      within(dialog).queryByRole('button', { name: 'Cancelarlo en su lugar' }),
    ).not.toBeInTheDocument()

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Sí, finalizar' }),
    )

    await waitFor(() =>
      expect(finishTrainingSession).toHaveBeenCalledWith(
        ATHLETE_ID,
        withDoneSets.id,
      ),
    )
  })

  it('sin ninguna serie hecha, finalizar avisa y ofrece cancelar en su lugar (CE-2)', async () => {
    renderActions(trainingSession())

    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar entrenamiento' }),
    )
    const dialog = dialogNamed('Todavía no hiciste ninguna serie')
    expect(within(dialog).getByText(/Te conviene cancelarlo/)).toBeVisible()

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelarlo en su lugar' }),
    )

    // la confirmación de finalizar se cierra y se abre la de cancelar
    const cancelDialog = dialogNamed('¿Cancelar el entrenamiento?')
    expect(cancelDialog).toBeVisible()
    expect(finishTrainingSession).not.toHaveBeenCalled()
    expect(cancelTrainingSession).not.toHaveBeenCalled()
  })

  it('cancelar pide confirmación y, al confirmar, cancela la sesión', async () => {
    vi.mocked(cancelTrainingSession).mockResolvedValue(
      trainingSession({ status: 'CANCELLED' }),
    )
    renderActions()

    await userEvent.click(
      screen.getByRole('button', { name: 'Cancelar entrenamiento' }),
    )
    const dialog = dialogNamed('¿Cancelar el entrenamiento?')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Sí, cancelar' }),
    )

    await waitFor(() =>
      expect(cancelTrainingSession).toHaveBeenCalledWith(
        ATHLETE_ID,
        withDoneSets.id,
      ),
    )
    expect(finishTrainingSession).not.toHaveBeenCalled()
  })

  it('«Cancelar» de la confirmación no envía nada', async () => {
    renderActions()

    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar entrenamiento' }),
    )
    const dialog = dialogNamed('¿Finalizar el entrenamiento?')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    )

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '¿Finalizar el entrenamiento?' }),
      ).not.toBeInTheDocument(),
    )
    expect(finishTrainingSession).not.toHaveBeenCalled()
  })

  it('si el servidor rechaza la acción, muestra su mensaje', async () => {
    vi.mocked(finishTrainingSession).mockRejectedValue(
      new ApiError(
        'Ya no podés cargar ni corregir series: el entrenamiento no está en curso',
        409,
      ),
    )
    renderActions()

    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar entrenamiento' }),
    )
    await userEvent.click(
      within(dialogNamed('¿Finalizar el entrenamiento?')).getByRole('button', {
        name: 'Sí, finalizar',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya no podés cargar ni corregir series: el entrenamiento no está en curso',
    )
  })
})
