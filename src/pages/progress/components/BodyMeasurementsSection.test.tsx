import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { createBodyMeasurement } from '../../../lib/body-measurements/create-body-measurement'
import { getBodyMeasurementTypes } from '../../../lib/body-measurements/get-body-measurement-types'
import { getBodyMeasurements } from '../../../lib/body-measurements/get-body-measurements'
import { updateBodyMeasurement } from '../../../lib/body-measurements/update-body-measurement'
import { session } from '../../../test/auth-fixtures'
import {
  bodyMeasurementRecord,
  bodyMeasurementTypes,
  bodyMeasurementsPage,
} from '../../../test/body-measurement-fixtures'
import { BodyMeasurementsSection } from './BodyMeasurementsSection'

vi.mock('../../../lib/body-measurements/get-body-measurement-types', () => ({
  getBodyMeasurementTypes: vi.fn(),
}))
vi.mock('../../../lib/body-measurements/get-body-measurements', () => ({
  getBodyMeasurements: vi.fn(),
}))
vi.mock('../../../lib/body-measurements/create-body-measurement', () => ({
  createBodyMeasurement: vi.fn(),
}))
vi.mock('../../../lib/body-measurements/update-body-measurement', () => ({
  updateBodyMeasurement: vi.fn(),
}))

const ATHLETE_ID = session('ATHLETE').user.id
const TODAY = '2026-11-06'
const SAVED = bodyMeasurementRecord()

const renderSection = () =>
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
      <BodyMeasurementsSection athleteId={ATHLETE_ID} today={TODAY} />
    </QueryClientProvider>,
  )

// el listado: los últimos registros, o el de un día (from = to) para el aviso del 409
const routeRecords = (records = [SAVED]) =>
  vi.mocked(getBodyMeasurements).mockImplementation(async (_id, query = {}) => {
    if (query.from) {
      return bodyMeasurementsPage(
        records.filter(({ date }) => date === query.from),
      )
    }
    return bodyMeasurementsPage(records)
  })

const field = (label: string) => screen.getByLabelText(label)
const submit = (label = 'Registrar medidas') =>
  userEvent.click(screen.getByRole('button', { name: label }))

beforeEach(() => {
  vi.mocked(getBodyMeasurementTypes).mockReset()
  vi.mocked(getBodyMeasurements).mockReset()
  vi.mocked(createBodyMeasurement).mockReset()
  vi.mocked(updateBodyMeasurement).mockReset()
  vi.mocked(getBodyMeasurementTypes).mockResolvedValue(bodyMeasurementTypes)
  routeRecords([])
  saveSession(session('ATHLETE'))
  // 23:30 del 6/11 en Argentina: el "hoy" de la app es el 6 (solo se fija la fecha)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-07T02:30:00Z'))
})

describe('BodyMeasurementsSection · formulario', () => {
  it('arma un campo por medida del catálogo, dos para las bilaterales', async () => {
    renderSection()

    expect(await screen.findByLabelText('Cintura')).toBeInTheDocument()
    expect(field('Brazo, lado izquierdo')).toBeInTheDocument()
    expect(field('Brazo, lado derecho')).toBeInTheDocument()
    expect(field('Pierna (muslo), lado izquierdo')).toBeInTheDocument()
    expect(field('% de grasa')).toBeInTheDocument()
    expect(screen.getAllByText('cm').length).toBeGreaterThan(0)
  })

  it('registra solo las medidas cargadas, con su lado, y avisa', async () => {
    vi.mocked(createBodyMeasurement).mockResolvedValue(SAVED)
    renderSection()
    await screen.findByLabelText('Cintura')

    await userEvent.type(field('Cintura'), '84.5')
    await userEvent.type(field('Brazo, lado derecho'), '35.25')
    await userEvent.type(
      field('Comentario de las medidas'),
      'Después de entrenar',
    )
    submit()

    await waitFor(() =>
      expect(createBodyMeasurement).toHaveBeenCalledWith(ATHLETE_ID, {
        date: TODAY,
        comment: 'Después de entrenar',
        values: [
          { type: 'WAIST', value: 84.5 },
          { type: 'ARM', side: 'RIGHT', value: 35.25 },
        ],
      }),
    )
    expect(
      await screen.findByText(
        'Registraste las medidas del 6 de noviembre de 2026.',
      ),
    ).toBeInTheDocument()
  })

  it('sin ninguna medida no envía y lo dice junto al botón', async () => {
    renderSection()
    await screen.findByLabelText('Cintura')

    submit()

    expect(
      await screen.findByText(
        'Cargá al menos una medida para guardar el registro.',
      ),
    ).toBeInTheDocument()
    expect(createBodyMeasurement).not.toHaveBeenCalled()
  })

  it('un valor fuera del rango del catálogo se marca al salir del campo', async () => {
    renderSection()
    await screen.findByLabelText('Cintura')

    await userEvent.type(field('Brazo, lado izquierdo'), '4')
    await userEvent.tab()

    expect(
      await screen.findByText('El valor debe estar entre 5 y 100'),
    ).toBeInTheDocument()
    expect(field('Brazo, lado izquierdo')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('un 400 del servidor llega al campo de esa medida (values[i] → campo)', async () => {
    vi.mocked(createBodyMeasurement).mockRejectedValue(
      new ApiError('La solicitud tiene campos inválidos', 400, {
        fieldErrors: [
          {
            field: 'values[1].value',
            message: 'El valor debe estar entre 5 y 100',
          },
        ],
      }),
    )
    renderSection()
    await screen.findByLabelText('Cintura')

    await userEvent.type(field('Cintura'), '80')
    await userEvent.type(field('Brazo, lado derecho'), '35')
    submit()

    expect(
      await screen.findByText('El valor debe estar entre 5 y 100'),
    ).toBeInTheDocument()
    expect(field('Brazo, lado derecho')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Cintura')).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('si el catálogo no carga, lo dice y permite reintentar', async () => {
    vi.mocked(getBodyMeasurementTypes).mockRejectedValueOnce(
      new Error('sin red'),
    )
    renderSection()

    expect(
      await screen.findByText(
        'No se pudieron cargar las medidas. Intentá nuevamente.',
      ),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByLabelText('Cintura')).toBeInTheDocument()
  })
})

describe('BodyMeasurementsSection · día ya registrado (409)', () => {
  it('ofrece editar el registro de ese día y guarda la lista completa con PUT', async () => {
    vi.mocked(createBodyMeasurement).mockRejectedValue(
      new ApiError('Ya existe un registro de medidas para el 06/11/2026', 409),
    )
    vi.mocked(updateBodyMeasurement).mockResolvedValue(
      bodyMeasurementRecord({ date: TODAY }),
    )
    routeRecords([SAVED])
    renderSection()
    await screen.findByLabelText('Cintura')

    await userEvent.type(field('Cintura'), '85')
    submit()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar ese registro' }),
    )

    // el formulario se abre con los valores del registro existente
    expect(
      await screen.findByRole('heading', { name: 'Editar medidas', level: 2 }),
    ).toBeInTheDocument()
    expect(field('Cintura')).toHaveValue(84.5)
    expect(field('Brazo, lado derecho')).toHaveValue(35.25)

    // un campo vacío quita la medida: el PUT manda solo las que quedan
    await userEvent.clear(field('Brazo, lado derecho'))
    await userEvent.clear(field('Cintura'))
    await userEvent.type(field('Cintura'), '85')
    submit('Guardar cambios')

    await waitFor(() =>
      expect(updateBodyMeasurement).toHaveBeenCalledWith(ATHLETE_ID, SAVED.id, {
        date: TODAY,
        comment: 'Después de entrenar',
        values: [{ type: 'WAIST', value: 85 }],
      }),
    )
  })
})

describe('BodyMeasurementsSection · últimos registros', () => {
  it('muestra cada medida del registro con su nombre y unidad', async () => {
    routeRecords([SAVED])
    renderSection()

    const list = await screen.findByRole('list', { name: 'Últimas medidas' })
    const items = within(list).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Después de entrenar')
    expect(within(list).getByText('84,5 cm')).toBeInTheDocument()
    expect(within(list).getByText('35,25 cm')).toBeInTheDocument()
    expect(within(list).getByText('Brazo, lado derecho')).toBeInTheDocument()
  })
})
