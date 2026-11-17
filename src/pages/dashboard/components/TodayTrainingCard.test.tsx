import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { getAthleteRoutine } from '../../../lib/athlete-routine/get-athlete-routine'
import { saveSession } from '../../../lib/auth'
import { getInProgressSession } from '../../../lib/training-sessions/get-in-progress-session'
import { startTrainingSession } from '../../../lib/training-sessions/start-training-session'
import { trainingPath } from '../../../router/paths'
import {
  assignedRoutine,
  athleteRoutine,
  TORSO_DAY_ID,
} from '../../../test/athlete-routine-fixtures'
import { session } from '../../../test/auth-fixtures'
import {
  SESSION_ID,
  trainingSession,
} from '../../../test/training-session-fixtures'
import { ATHLETE_ID, renderWithRouter } from '../dashboard-test-utils'
import { TodayTrainingCard } from './TodayTrainingCard'

vi.mock('../../../lib/athlete-routine/get-athlete-routine', () => ({
  getAthleteRoutine: vi.fn(),
}))
vi.mock('../../../lib/training-sessions/get-in-progress-session', () => ({
  getInProgressSession: vi.fn(),
}))
vi.mock('../../../lib/training-sessions/start-training-session', () => ({
  startTrainingSession: vi.fn(),
}))

const renderCard = () =>
  renderWithRouter(<TodayTrainingCard athleteId={ATHLETE_ID} />)

const card = () => screen.getByRole('region', { name: 'Entrenamiento de hoy' })

const startButton = () =>
  screen.queryByRole('button', { name: 'Iniciar entrenamiento' })

beforeEach(() => {
  saveSession(session('ATHLETE'))
  vi.mocked(getAthleteRoutine).mockReset()
  vi.mocked(getInProgressSession).mockReset()
  vi.mocked(startTrainingSession).mockReset()
  // la rutina de prueba: el día 1 (Torso) es el que toca, sin sesión en curso
  vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
  vi.mocked(getInProgressSession).mockResolvedValue(null)
})

describe('TodayTrainingCard · el día que toca', () => {
  it('muestra el día con sus ejercicios y ofrece iniciar', async () => {
    renderCard()

    expect(
      await within(card()).findByRole('heading', {
        name: 'Día 1: Torso',
        level: 3,
      }),
    ).toBeInTheDocument()
    expect(
      within(card()).getByRole('list', { name: 'Ejercicios del día' }),
    ).toHaveTextContent('Press de banca')
    expect(startButton()).toBeEnabled()
  })

  it('sin rutina asignada muestra el estado vacío y no ofrece iniciar', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(null)

    renderCard()

    expect(
      await screen.findByText('Tu entrenador aún no te asignó una rutina'),
    ).toBeInTheDocument()
    expect(startButton()).not.toBeInTheDocument()
  })

  it('con la rutina vencida explica que venció y no ofrece iniciar', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(
      athleteRoutine({ expired: true }),
    )

    renderCard()

    expect(await screen.findByText('Tu rutina venció')).toBeInTheDocument()
    expect(startButton()).not.toBeInTheDocument()
  })

  it('una rutina sin días muestra el estado vacío', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(
      athleteRoutine({
        nextDayId: null,
        routine: assignedRoutine({ days: [] }),
      }),
    )

    renderCard()

    expect(
      await screen.findByText('Tu rutina todavía no tiene días cargados'),
    ).toBeInTheDocument()
    expect(startButton()).not.toBeInTheDocument()
  })

  it('si falla la rutina muestra el error y Reintentar la vuelve a pedir', async () => {
    vi.mocked(getAthleteRoutine)
      .mockRejectedValueOnce(
        new ApiError('No tiene permisos para acceder a este atleta', 403),
      )
      .mockResolvedValue(athleteRoutine())
    const user = userEvent.setup()

    renderCard()

    expect(await within(card()).findByRole('alert')).toHaveTextContent(
      'No tiene permisos para acceder a este atleta',
    )
    await user.click(within(card()).getByRole('button', { name: 'Reintentar' }))

    expect(
      await within(card()).findByRole('heading', { name: 'Día 1: Torso' }),
    ).toBeInTheDocument()
  })
})

describe('TodayTrainingCard · iniciar y retomar', () => {
  it('iniciar crea la sesión del día que toca y va a la pantalla del entrenamiento', async () => {
    vi.mocked(startTrainingSession).mockResolvedValue(trainingSession())
    const user = userEvent.setup()
    const router = renderCard()

    await user.click(
      await screen.findByRole('button', { name: 'Iniciar entrenamiento' }),
    )

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(trainingPath(SESSION_ID)),
    )
    expect(startTrainingSession).toHaveBeenCalledWith(ATHLETE_ID, {
      routineDayId: TORSO_DAY_ID,
    })
  })

  it('con una sesión en curso ofrece retomarla y no iniciar otra', async () => {
    vi.mocked(getInProgressSession).mockResolvedValue(trainingSession())
    const user = userEvent.setup()
    const router = renderCard()

    expect(
      await screen.findByText('Tenés un entrenamiento en curso'),
    ).toBeInTheDocument()
    expect(startButton()).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retomar' }))

    expect(router.state.location.pathname).toBe(trainingPath(SESSION_ID))
  })

  it('un 409 al iniciar lleva a retomar la sesión que ya estaba en curso, sin mostrar error', async () => {
    vi.mocked(getInProgressSession)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(trainingSession())
    vi.mocked(startTrainingSession).mockRejectedValue(
      new ApiError('Ya tenés un entrenamiento en curso', 409),
    )
    const user = userEvent.setup()

    renderCard()
    await user.click(
      await screen.findByRole('button', { name: 'Iniciar entrenamiento' }),
    )

    expect(
      await screen.findByRole('button', { name: 'Retomar' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('un error al iniciar (422) se muestra con el texto del backend', async () => {
    vi.mocked(startTrainingSession).mockRejectedValue(
      new ApiError(
        'La rutina venció, no se puede iniciar un entrenamiento',
        422,
      ),
    )
    const user = userEvent.setup()

    renderCard()
    await user.click(
      await screen.findByRole('button', { name: 'Iniciar entrenamiento' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La rutina venció, no se puede iniciar un entrenamiento',
    )
    expect(startButton()).toBeEnabled()
  })
})
