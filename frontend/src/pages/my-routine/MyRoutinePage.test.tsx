import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { getAthleteRoutine } from '../../lib/athlete-routine/get-athlete-routine'
import { saveSession } from '../../lib/auth'
import { getMuscleGroups } from '../../lib/exercises/get-muscle-groups'
import { todayInAppTimeZone } from '../../lib/iso-date'
import {
  createMemoryRouter,
  RouterProvider,
  useParams,
  type RouterProviderProps,
} from '../../lib/navigation'
import { getInProgressSession } from '../../lib/training-sessions/get-in-progress-session'
import { startTrainingSession } from '../../lib/training-sessions/start-training-session'
import { paths, trainingPath } from '../../router/paths'
import {
  assignedRoutine,
  athleteRoutine,
  legsDay,
  LEGS_DAY_ID,
  TORSO_DAY_ID,
  torsoDay,
} from '../../test/athlete-routine-fixtures'
import { session } from '../../test/auth-fixtures'
import { muscleGroups } from '../../test/exercise-fixtures'
import {
  SESSION_ID,
  trainingSession,
} from '../../test/training-session-fixtures'
import { MyRoutinePage } from './MyRoutinePage'

vi.mock('../../lib/athlete-routine/get-athlete-routine', () => ({
  getAthleteRoutine: vi.fn(),
}))
vi.mock('../../lib/exercises/get-muscle-groups', () => ({
  getMuscleGroups: vi.fn(),
}))
vi.mock('../../lib/training-sessions/get-in-progress-session', () => ({
  getInProgressSession: vi.fn(),
}))
vi.mock('../../lib/training-sessions/start-training-session', () => ({
  startTrainingSession: vi.fn(),
}))

const ATHLETE_ID = session('ATHLETE').user.id

// la pantalla del entrenamiento es otra página: alcanza con saber a qué sesión se navegó
function TrainingScreen() {
  const { sessionId } = useParams()
  return <h1>Entrenamiento {sessionId}</h1>
}

let router: RouterProviderProps['router']

const renderPage = () => {
  router = createMemoryRouter(
    [
      { path: paths.myRoutine, element: <MyRoutinePage /> },
      { path: paths.training, element: <TrainingScreen /> },
    ],
    { initialEntries: [paths.myRoutine] },
  )
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const dayTab = (name: RegExp | string) => screen.getByRole('tab', { name })
const exercises = () => screen.findByRole('list', { name: 'Ejercicios' })
const exerciseItem = async (name: string) =>
  within(await exercises())
    .getByRole('heading', { name, level: 3 })
    .closest('li') as HTMLElement
// valor de un dato del ejercicio por su etiqueta (<dt>/<dd>)
const metric = (item: HTMLElement, label: string) =>
  within(item).getByText(label).nextElementSibling?.textContent

beforeEach(() => {
  vi.mocked(getAthleteRoutine).mockReset()
  vi.mocked(getMuscleGroups).mockReset()
  vi.mocked(getMuscleGroups).mockResolvedValue(muscleGroups)
  vi.mocked(getInProgressSession).mockReset()
  // por defecto, sin entrenamiento en curso (204)
  vi.mocked(getInProgressSession).mockResolvedValue(null)
  vi.mocked(startTrainingSession).mockReset()
  saveSession(session('ATHLETE'))
})

describe('MyRoutinePage · rutina activa', () => {
  it('muestra un skeleton mientras carga y después la rutina del atleta', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())

    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Mi rutina', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('status', { name: 'Cargando tu rutina' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Fuerza 2 días')).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: 'Cargando tu rutina' }),
    ).not.toBeInTheDocument()
    expect(getAthleteRoutine).toHaveBeenCalledWith(ATHLETE_ID)
    expect(screen.getByText('Objetivo: Fuerza')).toBeInTheDocument()
    expect(
      screen.getByText('Vigente hasta el 28 de diciembre de 2026'),
    ).toBeInTheDocument()
  })

  it('abre el día que toca, marcado como "Hoy", con sus ejercicios y parámetros (CA-1)', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())

    renderPage()

    const bench = await exerciseItem('Press de banca')
    expect(dayTab('Día 1: Torso, hoy')).toHaveAttribute('aria-selected', 'true')
    expect(dayTab('Día 2: Pierna')).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(
      'Día 1: Torso, hoy',
    )
    expect(screen.getByText('Hoy te toca')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Día 1: Torso', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 ejercicios')).toBeInTheDocument()

    expect(within(bench).getByText('Pecho')).toBeInTheDocument()
    expect(metric(bench, 'Series × reps')).toBe('4 × 8')
    expect(metric(bench, 'Peso')).toBe('62,5 kg')
    expect(metric(bench, 'Descanso')).toBe('2 min')
    expect(metric(bench, 'Esfuerzo')).toBe('RIR 2')
    expect(bench).toHaveTextContent(
      'Nota técnica: Bajar controlado hasta tocar el pecho',
    )
  })

  it('los ejercicios van en orden y sin los datos que el entrenador no cargó', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())

    renderPage()

    const items = within(await exercises()).getAllByRole('listitem')
    expect(
      items.map(
        (item) => within(item).getByRole('heading', { level: 3 }).textContent,
      ),
    ).toEqual(['Press de banca', 'Remo con barra'])
    const row = items[1]
    expect(metric(row, 'Series × reps')).toBe('3 × 10')
    expect(metric(row, 'Descanso')).toBe('1 min 30 s')
    expect(within(row).queryByText('Peso')).not.toBeInTheDocument()
    expect(within(row).queryByText('Esfuerzo')).not.toBeInTheDocument()
    expect(within(row).queryByText(/Nota técnica/)).not.toBeInTheDocument()
  })

  it('muestra los datos de la rutina', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())

    renderPage()

    const card = (
      await screen.findByRole('heading', { name: 'Sobre la rutina' })
    ).closest('section') as HTMLElement
    expect(card).toHaveTextContent(
      'Bloque de 8 semanas con progresión de cargas',
    )
    expect(
      within(card).getByText('Frecuencia').nextElementSibling,
    ).toHaveTextContent('2 días por semana')
    expect(
      within(card).getByText('Duración').nextElementSibling,
    ).toHaveTextContent('8 semanas')
    expect(
      within(card).getByText('Asignada el').nextElementSibling,
    ).toHaveTextContent('3 de noviembre de 2026')
  })

  it('omite los datos opcionales que la rutina no tiene', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(
      athleteRoutine({
        endDate: null,
        routine: assignedRoutine({
          description: null,
          goal: null,
          daysPerWeek: null,
          durationWeeks: null,
        }),
      }),
    )

    renderPage()

    expect(
      await screen.findByText('Sin fecha de vencimiento'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Objetivo/)).not.toBeInTheDocument()
    expect(screen.queryByText('Frecuencia')).not.toBeInTheDocument()
    expect(screen.queryByText('Duración')).not.toBeInTheDocument()
    expect(screen.getByText('Asignada el')).toBeInTheDocument()
  })
})

describe('MyRoutinePage · otros días (CA-2)', () => {
  it('al elegir otro día muestra sus ejercicios', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    renderPage()
    await exercises()

    await userEvent.click(dayTab('Día 2: Pierna'))

    expect(dayTab('Día 2: Pierna')).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByRole('heading', { name: 'Día 2: Pierna', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Hoy te toca')).not.toBeInTheDocument()
    const squat = await exerciseItem('Sentadilla')
    expect(within(squat).getByText('Cuádriceps')).toBeInTheDocument()
    expect(metric(squat, 'Esfuerzo')).toBe('RPE 8.5')
    expect(screen.queryByText('Press de banca')).not.toBeInTheDocument()
  })

  it('se cambia de día con el teclado', async () => {
    const user = userEvent.setup()
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    renderPage()
    await exercises()

    dayTab('Día 1: Torso, hoy').focus()
    await user.keyboard('{ArrowRight}')

    expect(dayTab('Día 2: Pierna')).toHaveFocus()
    expect(
      screen.getByRole('heading', { name: 'Día 2: Pierna', level: 2 }),
    ).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')
    expect(dayTab('Día 1: Torso, hoy')).toHaveFocus()
    expect(screen.getByText('Hoy te toca')).toBeInTheDocument()
  })

  it('marca como "Hoy" el día que manda el backend aunque no sea el primero', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(
      athleteRoutine({ nextDayId: LEGS_DAY_ID }),
    )

    renderPage()

    await exerciseItem('Sentadilla')
    expect(dayTab('Día 2: Pierna, hoy')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(dayTab('Día 1: Torso')).toHaveAttribute('aria-selected', 'false')
  })

  it('un día sin ejercicios muestra su estado vacío', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(
      athleteRoutine({
        routine: assignedRoutine({
          days: [torsoDay(), { ...legsDay(), exercises: [] }],
        }),
      }),
    )
    renderPage()
    await exercises()

    await userEvent.click(dayTab('Día 2: Pierna'))

    expect(screen.getByText('Este día no tiene ejercicios')).toBeInTheDocument()
    expect(
      screen.queryByRole('list', { name: 'Ejercicios' }),
    ).not.toBeInTheDocument()
  })

  it('una rutina sin días muestra su estado vacío', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(
      athleteRoutine({
        nextDayId: null,
        routine: assignedRoutine({ days: [] }),
      }),
    )

    renderPage()

    expect(
      await screen.findByText('Tu rutina todavía no tiene días cargados'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    // los datos de la rutina se siguen viendo
    expect(screen.getByText('Fuerza 2 días')).toBeInTheDocument()
  })

  it('si el catálogo de grupos musculares falla, muestra los ejercicios sin el grupo', async () => {
    vi.mocked(getMuscleGroups).mockRejectedValue(
      new ApiError('No se pudo conectar con el servidor', 0),
    )
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())

    renderPage()

    const bench = await exerciseItem('Press de banca')
    expect(metric(bench, 'Series × reps')).toBe('4 × 8')
    expect(within(bench).queryByText('Pecho')).not.toBeInTheDocument()
    expect(within(bench).queryByText('CHEST')).not.toBeInTheDocument()
  })
})

describe('MyRoutinePage · estados', () => {
  it('sin rutina asignada muestra el mensaje (CE-1)', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(null)

    renderPage()

    expect(
      await screen.findByText('Tu entrenador aún no te asignó una rutina'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument()
  })

  it('una rutina vencida muestra el aviso con la fecha y la rutina sigue visible (CE-2)', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(
      athleteRoutine({
        assignmentDate: '2026-09-01',
        endDate: '2026-09-28',
        expired: true,
      }),
    )

    renderPage()

    expect(await screen.findByRole('note')).toHaveTextContent(
      'Rutina vencida: terminó el 28 de septiembre de 2026.',
    )
    expect(
      screen.getByText('Venció el 28 de septiembre de 2026'),
    ).toBeInTheDocument()
    expect(await exerciseItem('Press de banca')).toBeInTheDocument()
  })

  it('una rutina vigente no muestra el aviso de vencimiento', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())

    renderPage()

    await exercises()
    expect(screen.queryByText(/Rutina vencida/)).not.toBeInTheDocument()
  })

  it('un 403 muestra el aviso de permisos sin Reintentar (CE-3)', async () => {
    vi.mocked(getAthleteRoutine).mockRejectedValue(
      new ApiError('No tiene permisos para acceder a este atleta', 403),
    )

    renderPage()

    expect(
      await screen.findByText('No podés ver esta rutina'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Mi rutina', level: 1 }),
    ).toBeInTheDocument()
  })

  it.each([404, 400])(
    'un %i muestra que no se encontró la cuenta, sin Reintentar',
    async (status) => {
      vi.mocked(getAthleteRoutine).mockRejectedValue(
        new ApiError(`No existe el atleta con id ${ATHLETE_ID}`, status),
      )

      renderPage()

      expect(
        await screen.findByText('No encontramos tu cuenta'),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Volvé a iniciar sesión. Si sigue pasando, hablá con tu entrenador.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText(ATHLETE_ID, { exact: false })).toBeNull()
      expect(
        screen.queryByRole('button', { name: 'Reintentar' }),
      ).not.toBeInTheDocument()
    },
  )

  it('un error de red muestra el mensaje y Reintentar vuelve a pedir la rutina (CE-4)', async () => {
    vi.mocked(getAthleteRoutine)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValueOnce(athleteRoutine())

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await exerciseItem('Press de banca')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(getAthleteRoutine).toHaveBeenCalledTimes(2)
  })

  it('un error inesperado muestra un mensaje genérico', async () => {
    vi.mocked(getAthleteRoutine).mockRejectedValue(new Error('boom'))

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado. Intentá nuevamente.',
    )
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument()
  })
})

// ---- US-18: iniciar y retomar el entrenamiento desde Mi rutina ----

const START = 'Iniciar entrenamiento'
const startButton = () => screen.findByRole('button', { name: START })
const trainingScreen = (sessionId = SESSION_ID) =>
  screen.findByRole('heading', { name: `Entrenamiento ${sessionId}` })
// sesión en progreso iniciada hoy (en la zona de la app) a las 19:15
const inProgressToday = () =>
  trainingSession({ sessionDate: todayInAppTimeZone() })

describe('MyRoutinePage · iniciar entrenamiento (US-18)', () => {
  it('ofrece iniciar el día que toca y al iniciar va a la pantalla del entrenamiento (CA-1)', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    vi.mocked(startTrainingSession).mockResolvedValue(trainingSession())
    renderPage()

    const panel = await screen.findByRole('tabpanel')
    await userEvent.click(within(panel).getByRole('button', { name: START }))

    expect(await trainingScreen()).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(trainingPath(SESSION_ID))
    expect(startTrainingSession).toHaveBeenCalledWith(ATHLETE_ID, {
      routineDayId: TORSO_DAY_ID,
    })
    expect(getInProgressSession).toHaveBeenCalledWith(ATHLETE_ID)
  })

  it('inicia el día elegido aunque no sea el que toca', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    vi.mocked(startTrainingSession).mockResolvedValue(
      trainingSession({ id: 'sesion-pierna', day: legsDay() }),
    )
    renderPage()
    await startButton()

    await userEvent.click(dayTab('Día 2: Pierna'))
    await userEvent.click(screen.getByRole('button', { name: START }))

    expect(await trainingScreen('sesion-pierna')).toBeInTheDocument()
    expect(startTrainingSession).toHaveBeenCalledWith(ATHLETE_ID, {
      routineDayId: LEGS_DAY_ID,
    })
  })

  it('mientras inicia, el botón dice "Iniciando…" y no se puede iniciar otro día', async () => {
    let resolve: (value: ReturnType<typeof trainingSession>) => void = () => {}
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    vi.mocked(startTrainingSession).mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    renderPage()

    await userEvent.click(await startButton())

    expect(screen.getByRole('button', { name: 'Iniciando…' })).toBeDisabled()
    await userEvent.click(dayTab('Día 2: Pierna'))
    expect(screen.getByRole('button', { name: START })).toBeDisabled()

    resolve(trainingSession())
    expect(await trainingScreen()).toBeInTheDocument()
    expect(startTrainingSession).toHaveBeenCalledTimes(1)
  })

  it('mientras no se sabe si hay un entrenamiento en curso, sigue el skeleton', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    vi.mocked(getInProgressSession).mockReturnValue(new Promise(() => {}))

    renderPage()

    await waitFor(() => expect(getAthleteRoutine).toHaveBeenCalled())
    expect(
      screen.getByRole('status', { name: 'Cargando tu rutina' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: START })).toBeNull()
    expect(screen.queryByText('Fuerza 2 días')).toBeNull()
  })

  it('si no se puede saber si hay un entrenamiento en curso, ofrece iniciar igual', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    vi.mocked(getInProgressSession).mockRejectedValue(
      new ApiError(
        'Ocurrió un error inesperado. Intente nuevamente más tarde',
        500,
      ),
    )

    renderPage()

    expect(await startButton()).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('con la rutina vencida no ofrece iniciar en ningún día (CE-3)', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(
      athleteRoutine({
        assignmentDate: '2026-09-01',
        endDate: '2026-09-28',
        expired: true,
      }),
    )
    renderPage()

    expect(await screen.findByRole('note')).toHaveTextContent('Rutina vencida')
    await exercises()
    expect(screen.queryByRole('button', { name: START })).toBeNull()
    await userEvent.click(dayTab('Día 2: Pierna'))
    expect(screen.queryByRole('button', { name: START })).toBeNull()
  })

  it('un día sin ejercicios no ofrece iniciar', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(
      athleteRoutine({
        routine: assignedRoutine({
          days: [torsoDay(), { ...legsDay(), exercises: [] }],
        }),
      }),
    )
    renderPage()
    expect(await startButton()).toBeInTheDocument()

    await userEvent.click(dayTab('Día 2: Pierna'))

    expect(screen.getByText('Este día no tiene ejercicios')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: START })).toBeNull()
  })

  it('un 422 muestra el mensaje del backend y el botón sigue disponible', async () => {
    const message =
      'Tu rutina venció el 10/11/2026. Pedile a tu entrenador una nueva'
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    vi.mocked(startTrainingSession).mockRejectedValue(
      new ApiError(message, 422),
    )
    renderPage()

    await userEvent.click(await startButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: START })).toBeEnabled()
    expect(router.state.location.pathname).toBe(paths.myRoutine)
    // un 422 no es un entrenamiento en curso: no se vuelve a preguntar
    expect(getInProgressSession).toHaveBeenCalledTimes(1)
  })

  it('si falla la red muestra el error y Reintentar vuelve a iniciar el mismo día', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    vi.mocked(startTrainingSession)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValueOnce(
        trainingSession({ id: 'sesion-pierna', day: legsDay() }),
      )
    renderPage()
    await startButton()
    await userEvent.click(dayTab('Día 2: Pierna'))

    await userEvent.click(screen.getByRole('button', { name: START }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    expect(dayTab('Día 2: Pierna')).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await trainingScreen('sesion-pierna')).toBeInTheDocument()
    expect(startTrainingSession).toHaveBeenCalledTimes(2)
    expect(startTrainingSession).toHaveBeenLastCalledWith(ATHLETE_ID, {
      routineDayId: LEGS_DAY_ID,
    })
  })

  it('el error de un día no aparece en el panel de otro', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    vi.mocked(startTrainingSession).mockRejectedValue(
      new ApiError('No se pudo conectar con el servidor', 0),
    )
    renderPage()

    await userEvent.click(await startButton())
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await userEvent.click(dayTab('Día 2: Pierna'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: START })).toBeEnabled()

    await userEvent.click(dayTab('Día 1: Torso, hoy'))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('MyRoutinePage · entrenamiento en curso (US-18)', () => {
  const notice = (name: string) => screen.findByRole('region', { name })

  it('muestra el aviso con Retomar y no ofrece iniciar otro (CA-2)', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    vi.mocked(getInProgressSession).mockResolvedValue(inProgressToday())
    renderPage()

    const region = await notice('Tenés un entrenamiento en curso')
    expect(region).toHaveTextContent('Día 1: Torso, desde las 19:15.')
    expect(await exercises()).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: START })).toBeNull()
    await userEvent.click(dayTab('Día 2: Pierna'))
    expect(screen.queryByRole('button', { name: START })).toBeNull()

    await userEvent.click(
      within(region).getByRole('button', { name: 'Retomar' }),
    )

    expect(await trainingScreen()).toBeInTheDocument()
    expect(startTrainingSession).not.toHaveBeenCalled()
  })

  it('si quedó abierto de otro día, el aviso muestra también la fecha', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    vi.mocked(getInProgressSession).mockResolvedValue(
      trainingSession({
        sessionDate: '2026-11-01',
        startedAt: '2026-11-01T21:05:00Z',
        day: legsDay(),
      }),
    )
    renderPage()

    expect(await notice('Tenés un entrenamiento en curso')).toHaveTextContent(
      'Día 2: Pierna, desde el 1 de noviembre de 2026 a las 18:05.',
    )
  })

  it('con la rutina vencida igual ofrece retomarlo', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(
      athleteRoutine({ endDate: '2026-09-28', expired: true }),
    )
    vi.mocked(getInProgressSession).mockResolvedValue(inProgressToday())
    renderPage()

    const region = await notice('Tenés un entrenamiento en curso')
    expect(
      within(region).getByRole('button', { name: 'Retomar' }),
    ).toBeEnabled()
    expect(screen.getByRole('note')).toHaveTextContent('Rutina vencida')
  })

  it('sin rutina activa igual ofrece retomarlo', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(null)
    vi.mocked(getInProgressSession).mockResolvedValue(inProgressToday())
    renderPage()

    expect(await notice('Tenés un entrenamiento en curso')).toBeInTheDocument()
    expect(
      screen.getByText('Tu entrenador aún no te asignó una rutina'),
    ).toBeInTheDocument()
  })

  it('un 409 al iniciar busca el entrenamiento en curso, lo ofrece y recibe el foco (CE-1)', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    // otra pestaña lo inició después de que se cargó la página
    vi.mocked(getInProgressSession)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(inProgressToday())
    vi.mocked(startTrainingSession).mockRejectedValue(
      new ApiError(
        'Ya tenés un entrenamiento en curso. Retomalo para continuar',
        409,
      ),
    )
    renderPage()

    await userEvent.click(await startButton())

    const region = await notice('Ya tenés un entrenamiento en curso')
    expect(region).toHaveTextContent(
      'Día 1: Torso, desde las 19:15. Retomalo para continuar.',
    )
    expect(region.parentElement).toHaveFocus()
    expect(getInProgressSession).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('button', { name: START })).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.click(
      within(region).getByRole('button', { name: 'Retomar' }),
    )
    expect(await trainingScreen()).toBeInTheDocument()
  })

  it('después de un 409, si ya no hay uno en curso, vuelve a ofrecer iniciar', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    vi.mocked(getInProgressSession).mockResolvedValue(null)
    vi.mocked(startTrainingSession)
      .mockRejectedValueOnce(
        new ApiError(
          'La operación entra en conflicto con datos existentes',
          409,
        ),
      )
      .mockResolvedValueOnce(trainingSession())
    renderPage()

    await userEvent.click(await startButton())

    expect(
      await screen.findByText(
        'Tu entrenamiento anterior ya no está en curso. Podés iniciar uno nuevo.',
      ),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: START }))
    expect(await trainingScreen()).toBeInTheDocument()
  })

  it('después de un 409, si no se puede traer el entrenamiento en curso, permite reintentar', async () => {
    vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
    vi.mocked(getInProgressSession)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValueOnce(inProgressToday())
    vi.mocked(startTrainingSession).mockRejectedValue(
      new ApiError(
        'Ya tenés un entrenamiento en curso. Retomalo para continuar',
        409,
      ),
    )
    renderPage()

    await userEvent.click(await startButton())

    expect(
      await screen.findByText(/No se pudo traer para retomarlo/),
    ).toHaveTextContent('No se pudo conectar con el servidor')
    expect(screen.queryByRole('button', { name: START })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    const region = await notice('Ya tenés un entrenamiento en curso')
    expect(
      within(region).getByRole('button', { name: 'Retomar' }),
    ).toBeInTheDocument()
  })
})
