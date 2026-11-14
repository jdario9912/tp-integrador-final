import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import type { PerformedSet } from '../../../lib/training-sessions'
import { putPerformedSet } from '../../../lib/training-sessions/put-performed-set'
import { session } from '../../../test/auth-fixtures'
import { torsoDay } from '../../../test/athlete-routine-fixtures'
import {
  SESSION_ID,
  trainingSession,
} from '../../../test/training-session-fixtures'
import { SetRow } from './SetRow'

vi.mock('../../../lib/training-sessions/put-performed-set', () => ({
  putPerformedSet: vi.fn(),
}))

const ATHLETE_ID = session('ATHLETE').user.id
// Press de banca: 4 series de 8 con 62,5 kg recomendados
const exercise = torsoDay().exercises[0]
const DONE_BODY = { status: 'DONE', weight: 62.5, reps: 8 }

const recordDone = (overrides: Partial<PerformedSet> = {}): PerformedSet => ({
  id: 'serie-1',
  routineExerciseId: exercise.id,
  setNumber: 1,
  status: 'DONE',
  weight: 62.5,
  reps: 8,
  rpe: null,
  skipReason: null,
  ...overrides,
})

const renderRow = (record?: PerformedSet) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <SetRow
        athleteId={ATHLETE_ID}
        sessionId={SESSION_ID}
        exercise={exercise}
        setNumber={1}
        record={record}
      />
    </QueryClientProvider>,
  )
}

const weightInput = () =>
  screen.getByRole('textbox', { name: /Peso de la serie 1/ })
const repsInput = () =>
  screen.getByRole('textbox', { name: /Repeticiones de la serie 1/ })
const put = () => vi.mocked(putPerformedSet)

beforeEach(() => {
  put().mockReset()
  saveSession(session('ATHLETE'))
})

describe('SetRow · serie pendiente', () => {
  it('precarga peso y repeticiones con lo planificado y se completa con un toque', async () => {
    const user = userEvent.setup()
    put().mockResolvedValue(trainingSession())
    renderRow()
    expect(weightInput()).toHaveValue('62,5')
    expect(repsInput()).toHaveValue('8')

    let taps = 0
    await user.click(
      screen.getByRole('button', { name: 'Completar la serie 1' }),
    )
    taps += 1

    await waitFor(() =>
      expect(put()).toHaveBeenCalledWith(
        {
          athleteId: ATHLETE_ID,
          sessionId: SESSION_ID,
          routineExerciseId: exercise.id,
          setNumber: 1,
        },
        DONE_BODY,
      ),
    )
    // el criterio de US-19: completar una serie son como máximo 3 toques
    expect(taps).toBeLessThanOrEqual(3)
  })

  it('sin peso recomendado el peso está vacío y no envía hasta tenerlo', async () => {
    const user = userEvent.setup()
    // el peso es el único dato que falta: se pide antes de ir a la red
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SetRow
          athleteId={ATHLETE_ID}
          sessionId={SESSION_ID}
          exercise={{ ...exercise, recommendedWeight: null }}
          setNumber={2}
        />
      </QueryClientProvider>,
    )
    const weight = screen.getByRole('textbox', { name: /Peso de la serie 2/ })
    expect(weight).toHaveValue('')

    await user.click(
      screen.getByRole('button', { name: 'Completar la serie 2' }),
    )

    expect(
      screen.getByText('Ingresá el peso de una serie realizada'),
    ).toBeInTheDocument()
    expect(weight).toHaveAttribute('aria-invalid', 'true')
    expect(put()).not.toHaveBeenCalled()
  })

  it('el RPE opcional viaja en el cuerpo al completar', async () => {
    const user = userEvent.setup()
    put().mockResolvedValue(trainingSession())
    renderRow()

    await user.click(screen.getByRole('button', { name: 'Detalles' }))
    await user.type(
      screen.getByRole('textbox', { name: 'RPE (opcional)' }),
      '8',
    )
    await user.click(
      screen.getByRole('button', { name: 'Completar la serie 1' }),
    )

    await waitFor(() =>
      expect(put()).toHaveBeenCalledWith(expect.anything(), {
        ...DONE_BODY,
        rpe: 8,
      }),
    )
  })
})

describe('SetRow · omitir', () => {
  it('omite la serie con el motivo sin espacios', async () => {
    const user = userEvent.setup()
    put().mockResolvedValue(trainingSession())
    renderRow()

    await user.click(screen.getByRole('button', { name: 'Detalles' }))
    await user.click(screen.getByRole('button', { name: 'Omitir serie' }))
    await user.type(
      screen.getByRole('textbox', { name: /Motivo de la omisión/ }),
      '  Dolor de rodilla  ',
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar omisión' }))

    await waitFor(() =>
      expect(put()).toHaveBeenCalledWith(expect.anything(), {
        status: 'SKIPPED',
        skipReason: 'Dolor de rodilla',
      }),
    )
  })

  it('Enter en el motivo omite la serie sin enviar como hecha', async () => {
    const user = userEvent.setup()
    put().mockResolvedValue(trainingSession())
    renderRow()

    await user.click(screen.getByRole('button', { name: 'Detalles' }))
    await user.click(screen.getByRole('button', { name: 'Omitir serie' }))
    await user.type(
      screen.getByRole('textbox', { name: /Motivo de la omisión/ }),
      'Molestia{Enter}',
    )

    await waitFor(() =>
      expect(put()).toHaveBeenCalledWith(expect.anything(), {
        status: 'SKIPPED',
        skipReason: 'Molestia',
      }),
    )
    expect(put()).toHaveBeenCalledTimes(1)
  })

  it('sin motivo no envía y pide el motivo', async () => {
    const user = userEvent.setup()
    renderRow()

    await user.click(screen.getByRole('button', { name: 'Detalles' }))
    await user.click(screen.getByRole('button', { name: 'Omitir serie' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar omisión' }))

    expect(
      screen.getByText('Ingresá el motivo de una serie omitida'),
    ).toBeInTheDocument()
    expect(put()).not.toHaveBeenCalled()
  })

  it('cancelar cierra el motivo sin enviar nada', async () => {
    const user = userEvent.setup()
    renderRow()

    await user.click(screen.getByRole('button', { name: 'Detalles' }))
    await user.click(screen.getByRole('button', { name: 'Omitir serie' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.queryByRole('textbox', { name: /Motivo de la omisión/ }),
    ).not.toBeInTheDocument()
    expect(put()).not.toHaveBeenCalled()
  })
})

describe('SetRow · corregir', () => {
  it('una serie hecha sin cambios queda marcada y no se puede volver a enviar', () => {
    renderRow(recordDone())

    const hecha = screen.getByRole('button', { name: 'Serie 1 hecha' })
    expect(hecha).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Hecha')
  })

  it('cambiar una cifra ofrece guardar la corrección con el mismo PUT', async () => {
    const user = userEvent.setup()
    put().mockResolvedValue(trainingSession())
    renderRow(recordDone())

    await user.clear(repsInput())
    await user.type(repsInput(), '7')
    await user.click(
      screen.getByRole('button', {
        name: 'Guardar la corrección de la serie 1',
      }),
    )

    await waitFor(() =>
      expect(put()).toHaveBeenCalledWith(expect.anything(), {
        status: 'DONE',
        weight: 62.5,
        reps: 7,
      }),
    )
  })

  it('una serie omitida se completa con un toque usando lo planificado', async () => {
    const user = userEvent.setup()
    put().mockResolvedValue(trainingSession())
    renderRow({
      ...recordDone(),
      status: 'SKIPPED',
      weight: null,
      reps: null,
      skipReason: 'Dolor',
    })

    expect(screen.getByRole('status')).toHaveTextContent('Omitida: Dolor')
    await user.click(
      screen.getByRole('button', { name: 'Completar la serie 1' }),
    )

    await waitFor(() =>
      expect(put()).toHaveBeenCalledWith(expect.anything(), DONE_BODY),
    )
  })
})

describe('SetRow · errores', () => {
  it('un corte de red deja los datos en pantalla y Reintentar manda el mismo cuerpo', async () => {
    const user = userEvent.setup()
    put()
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValueOnce(trainingSession())
    renderRow()

    await user.click(
      screen.getByRole('button', { name: 'Completar la serie 1' }),
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo conectar con el servidor')
    expect(alert).toHaveTextContent('Lo que cargaste sigue en pantalla.')
    expect(weightInput()).toHaveValue('62,5')
    expect(repsInput()).toHaveValue('8')

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(put()).toHaveBeenCalledTimes(2))
    const [first, second] = put().mock.calls
    expect(second).toEqual(first)
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    )
  })

  it('un 409 avisa con el mensaje del backend y no ofrece reintentar', async () => {
    const user = userEvent.setup()
    put().mockRejectedValue(
      new ApiError(
        'Ya no podés cargar ni corregir series: el entrenamiento no está en curso',
        409,
      ),
    )
    renderRow()

    await user.click(
      screen.getByRole('button', { name: 'Completar la serie 1' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya no podés cargar ni corregir series: el entrenamiento no está en curso',
    )
    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument()
  })

  it('un 400 con campo marca ese campo con su mensaje', async () => {
    const user = userEvent.setup()
    put().mockRejectedValue(
      new ApiError('La solicitud tiene campos inválidos', 400, {
        fieldErrors: [
          {
            field: 'reps',
            message: 'Las repeticiones deben estar entre 1 y 999',
          },
        ],
      }),
    )
    renderRow()

    await user.click(
      screen.getByRole('button', { name: 'Completar la serie 1' }),
    )

    const message = await screen.findByText(
      'Las repeticiones deben estar entre 1 y 999',
    )
    expect(repsInput()).toHaveAttribute('aria-invalid', 'true')
    expect(repsInput()).toHaveAccessibleDescription(message.textContent ?? '')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('editar después de un error borra el aviso', async () => {
    const user = userEvent.setup()
    put().mockRejectedValue(
      new ApiError('No se pudo conectar con el servidor', 0),
    )
    renderRow()

    await user.click(
      screen.getByRole('button', { name: 'Completar la serie 1' }),
    )
    await screen.findByRole('alert')
    await user.type(repsInput(), '1')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('SetRow · lectura', () => {
  it('lista la serie pendiente con su estado dentro del grupo', () => {
    renderRow()
    const group = screen.getByRole('group', {
      name: 'Serie 1 de Press de banca',
    })
    expect(within(group).getByRole('status')).toHaveTextContent('Sin registrar')
  })
})
