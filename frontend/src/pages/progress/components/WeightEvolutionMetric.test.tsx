import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../../../lib/auth'
import type { BodyMeasurementRecord } from '../../../lib/body-measurements'
import { getBodyMeasurementTypes } from '../../../lib/body-measurements/get-body-measurement-types'
import { getBodyMeasurements } from '../../../lib/body-measurements/get-body-measurements'
import { MemoryRouter, useLocation } from '../../../lib/navigation'
import { getWeights } from '../../../lib/weights/get-weights'
import { session } from '../../../test/auth-fixtures'
import {
  bodyMeasurementRecord,
  bodyMeasurementTypes,
  bodyMeasurementsPage,
} from '../../../test/body-measurement-fixtures'
import { weightRecord, weightsPage } from '../../../test/weight-fixtures'
import { WeightEvolutionCard } from './WeightEvolutionCard'

// US-45 (F3): el selector de métrica de la evolución. El peso sigue igual; cada medida dibuja
// sus valores con su unidad. Pruebas de la tarjeta con las dos fuentes de datos mockeadas
vi.mock('../../../lib/weights/get-weights', () => ({ getWeights: vi.fn() }))
vi.mock('../../../lib/body-measurements/get-body-measurement-types', () => ({
  getBodyMeasurementTypes: vi.fn(),
}))
vi.mock('../../../lib/body-measurements/get-body-measurements', () => ({
  getBodyMeasurements: vi.fn(),
}))

const ATHLETE_ID = session('ATHLETE').user.id
const TODAY = '2026-11-06'

const weights = [
  weightRecord(),
  weightRecord({
    id: '0a9b8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d',
    date: '2026-11-01',
    weightKg: 73.1,
    comment: null,
  }),
]

// tres medidas: la cintura en dos días, el brazo derecho en uno. El de la cintura no tiene brazo
const measurements: BodyMeasurementRecord[] = [
  bodyMeasurementRecord({
    id: '11111111-1111-4111-8111-111111111111',
    date: TODAY,
    values: [
      { type: 'WAIST', side: null, value: 84.5 },
      { type: 'ARM', side: 'RIGHT', value: 35.25 },
    ],
  }),
  bodyMeasurementRecord({
    id: '22222222-2222-4222-8222-222222222222',
    date: '2026-10-30',
    values: [{ type: 'WAIST', side: null, value: 86 }],
  }),
]

const routeData = (records = measurements) => {
  vi.mocked(getWeights).mockImplementation(async (_id, query = {}) =>
    query.size === 10
      ? weightsPage(weights)
      : weightsPage(
          weights.filter(
            ({ date }) =>
              (!query.from || date >= query.from) &&
              (!query.to || date <= query.to),
          ),
        ),
  )
  vi.mocked(getBodyMeasurements).mockImplementation(async (_id, query = {}) => {
    const inRange = records.filter(
      ({ date }) =>
        (!query.from || date >= query.from) && (!query.to || date <= query.to),
    )
    return bodyMeasurementsPage(query.size === 10 ? records : inRange)
  })
}

const LocationProbe = () => {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}

const renderCard = (entry = '/progress') => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  return render(
    <>
      <WeightEvolutionCard athleteId={ATHLETE_ID} today={TODAY} />
      <LocationProbe />
    </>,
    { wrapper },
  )
}

const metricSelect = () => screen.findByLabelText('Medida')
const chart = (name: string) => screen.findByRole('img', { name })
// la tabla de datos vive en un <details>: se cuentan sus filas por el DOM
const chartRows = () => document.querySelectorAll('details table tbody tr')

beforeEach(() => {
  vi.mocked(getWeights).mockReset()
  vi.mocked(getBodyMeasurements).mockReset()
  vi.mocked(getBodyMeasurementTypes).mockReset()
  vi.mocked(getBodyMeasurementTypes).mockResolvedValue(bodyMeasurementTypes)
  routeData()
  saveSession(session('ATHLETE'))
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-07T02:30:00Z'))
})

describe('evolución · selector de métrica', () => {
  it('por defecto grafica el peso, con el selector en "Peso"', async () => {
    renderCard()

    expect(await chart('Evolución del peso')).toBeInTheDocument()
    expect(await metricSelect()).toHaveValue('weight')
    expect(screen.getByRole('option', { name: 'Peso' })).toBeInTheDocument()
  })

  it('elegir una medida pone la métrica en la URL y grafica sus valores con su unidad', async () => {
    renderCard()
    const select = await metricSelect()

    await userEvent.selectOptions(select, 'WAIST')

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('metric=WAIST'),
    )
    const figure = await chart('Evolución: Cintura')
    // dos registros con cintura: la descripción usa cm, no kg
    expect(figure).toHaveAccessibleDescription(
      /^2 registros, del 30 de octubre de 2026 al 6 de noviembre de 2026\. De 86 cm a 84,5 cm\./,
    )
    expect(
      screen.getByText('84,5 cm', { selector: 'strong' }),
    ).toBeInTheDocument()
    // el registro sin cintura no aporta punto: la tabla tiene dos filas
    expect(chartRows()).toHaveLength(2)
  })

  it('una medida bilateral se grafica por lado', async () => {
    renderCard()

    await userEvent.selectOptions(await metricSelect(), 'ARM-RIGHT')

    expect(await chart('Evolución: Brazo, lado derecho')).toBeInTheDocument()
    // un único registro con ese brazo: se dibuja el punto y se explica
    expect(
      screen.getByText(/Con un solo registro se ve el punto/),
    ).toBeInTheDocument()
  })

  it('abre directo en la medida que trae la URL', async () => {
    renderCard('/progress?metric=ARM-RIGHT')

    expect(await chart('Evolución: Brazo, lado derecho')).toBeInTheDocument()
    expect(await metricSelect()).toHaveValue('ARM-RIGHT')
  })

  it('una métrica desconocida en la URL vuelve al peso', async () => {
    renderCard('/progress?metric=CALF')

    expect(await chart('Evolución del peso')).toBeInTheDocument()
    expect(await metricSelect()).toHaveValue('weight')
  })

  it('sin registros de esa medida en el rango, lo dice con su nombre', async () => {
    routeData([])
    renderCard('/progress?metric=WAIST')

    expect(
      await screen.findByRole('heading', {
        name: 'Todavía no hay datos para graficar',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Cargar mis medidas' }),
    ).toBeInTheDocument()
  })

  it('un rango sin registros de esa medida lo dice con el nombre de la medida', async () => {
    renderCard('/progress?metric=ARM-RIGHT&from=2026-01-01&to=2026-01-31')

    expect(
      await screen.findByText(
        'No hay registros de brazo, lado derecho en este rango. Probá con otro rango de fechas.',
      ),
    ).toBeInTheDocument()
  })

  it('si el catálogo no carga, queda el peso y no aparece el selector', async () => {
    vi.mocked(getBodyMeasurementTypes).mockRejectedValue(new Error('sin red'))
    renderCard()

    expect(await chart('Evolución del peso')).toBeInTheDocument()
    expect(screen.queryByLabelText('Medida')).not.toBeInTheDocument()
  })

  it('la tabla de datos de una medida usa el nombre de la medida como columna', async () => {
    renderCard('/progress?metric=WAIST')

    await chart('Evolución: Cintura')
    expect(screen.getByText('Cintura', { selector: 'th' })).toBeInTheDocument()
  })
})
