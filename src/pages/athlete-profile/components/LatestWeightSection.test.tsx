import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { getWeights } from '../../../lib/weights/get-weights'
import { MemoryRouter } from '../../../lib/navigation'
import { session } from '../../../test/auth-fixtures'
import { weightRecord, weightsPage } from '../../../test/weight-fixtures'
import { LatestWeightSection } from './LatestWeightSection'

vi.mock('../../../lib/weights/get-weights', () => ({ getWeights: vi.fn() }))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'

const renderSection = (initialWeightKg: number | null) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <LatestWeightSection
          athleteId={ATHLETE_ID}
          initialWeightKg={initialWeightKg}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const section = () => screen.getByRole('region', { name: 'Último peso' })

beforeEach(() => {
  vi.mocked(getWeights).mockReset()
  saveSession(session('COACH'))
})

describe('LatestWeightSection', () => {
  it('muestra el último registro con su fecha y su comentario (US-26 CA-4)', async () => {
    vi.mocked(getWeights).mockResolvedValue(weightsPage([weightRecord()]))

    renderSection(80.25)

    expect(
      screen.getByRole('status', { name: 'Cargando último peso' }),
    ).toBeInTheDocument()
    const term = await within(section()).findByRole('term')
    expect(term).toHaveTextContent('Último registro')
    expect(term.nextElementSibling).toHaveTextContent('72,5 kg')
    expect(
      within(section()).getByText('6 de noviembre de 2026'),
    ).toHaveAttribute('datetime', '2026-11-06')
    expect(section()).toHaveTextContent('Registrado el 6 de noviembre de 2026.')
    expect(section()).toHaveTextContent('En ayunas')
    // con registros, el peso inicial ya no se muestra
    expect(section()).not.toHaveTextContent('Peso inicial')
    expect(getWeights).toHaveBeenCalledWith(ATHLETE_ID, { size: 1 })
  })

  it('un registro sin comentario muestra solo el peso y la fecha', async () => {
    vi.mocked(getWeights).mockResolvedValue(
      weightsPage([weightRecord({ comment: null, weightKg: 70 })]),
    )

    renderSection(null)

    expect(await within(section()).findByText('70 kg')).toBeInTheDocument()
    expect(section()).not.toHaveTextContent('En ayunas')
    expect(section()).not.toHaveTextContent(/null|undefined/)
  })

  it('sin registros rotula el peso inicial como tal', async () => {
    vi.mocked(getWeights).mockResolvedValue(weightsPage([]))

    renderSection(62)

    const term = await within(section()).findByRole('term')
    expect(term).toHaveTextContent('Peso inicial')
    expect(term.nextElementSibling).toHaveTextContent('62 kg')
  })

  it('un peso inicial de 0 no se toma como faltante', async () => {
    vi.mocked(getWeights).mockResolvedValue(weightsPage([]))

    renderSection(0)

    expect(await within(section()).findByText('0 kg')).toBeInTheDocument()
  })

  it('sin registros ni peso inicial invita a cargarlo desde la edición', async () => {
    vi.mocked(getWeights).mockResolvedValue(weightsPage([]))

    renderSection(null)

    expect(
      await within(section()).findByRole('heading', {
        name: 'Sin registros de peso',
      }),
    ).toBeInTheDocument()
    expect(
      within(section()).getByRole('link', { name: 'Cargar peso inicial' }),
    ).toHaveAttribute('href', `/athletes/${ATHLETE_ID}/edit`)
  })

  it('si falla la carga muestra su propio error y permite reintentar', async () => {
    vi.mocked(getWeights)
      .mockRejectedValueOnce(
        new ApiError(
          'Ocurrió un error inesperado. Intente nuevamente más tarde',
          500,
        ),
      )
      .mockResolvedValue(weightsPage([weightRecord()]))

    renderSection(62)

    expect(await within(section()).findByRole('alert')).toHaveTextContent(
      'No se pudo cargar el último peso.',
    )
    // no cae en el peso inicial: no se sabe si hay registros
    expect(section()).not.toHaveTextContent('62 kg')
    await userEvent.click(
      within(section()).getByRole('button', { name: 'Reintentar' }),
    )

    expect(await within(section()).findByText('72,5 kg')).toBeInTheDocument()
    expect(within(section()).queryByRole('alert')).not.toBeInTheDocument()
  })
})
