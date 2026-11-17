import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { MemoryRouter, useLocation } from '../../../lib/navigation'
import { getWeights } from '../../../lib/weights/get-weights'
import type { WeightsQuery } from '../../../lib/weights'
import { session } from '../../../test/auth-fixtures'
import { weightRecord, weightsPage } from '../../../test/weight-fixtures'
import { WeightEvolutionCard } from './WeightEvolutionCard'

vi.mock('../../../lib/weights/get-weights', () => ({ getWeights: vi.fn() }))

const ATHLETE_ID = session('ATHLETE').user.id
const TODAY = '2026-11-06'

const today = weightRecord()
const older = weightRecord({
  id: '0a9b8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d',
  date: '2026-11-01',
  weightKg: 73.1,
  comment: null,
})

// lo que devuelve el backend para cada consulta: el "último peso" (size 10) siempre ve todos los
// registros; el rango, solo los que caen dentro de from/to (inclusive)
const routeWeights = (
  records: ReturnType<typeof weightRecord>[] = [today, older],
  latest = records,
) =>
  vi
    .mocked(getWeights)
    .mockImplementation(
      async (_athleteId: string, query: WeightsQuery = {}) => {
        if (query.size === 10) return weightsPage(latest)
        const inRange = records.filter(
          ({ date }) =>
            (!query.from || date >= query.from) &&
            (!query.to || date <= query.to),
        )
        return weightsPage(inRange)
      },
    )

// muestra la ruta actual para comprobar que el rango viaja en la URL
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
      {/* el campo de peso de la página: el estado vacío lo enfoca */}
      <input id="weight-weightKg" aria-label="Peso de prueba" />
      <WeightEvolutionCard athleteId={ATHLETE_ID} today={TODAY} />
      <LocationProbe />
    </>,
    { wrapper },
  )
}

const searchOf = () => screen.getByTestId('location').textContent

beforeEach(() => {
  vi.mocked(getWeights).mockReset()
  saveSession(session('ATHLETE'))
})

describe('WeightEvolutionCard · gráfico', () => {
  it('muestra un esqueleto mientras llegan los datos', () => {
    vi.mocked(getWeights).mockReturnValue(new Promise(() => {}))

    renderCard()

    expect(
      screen.getByRole('status', { name: 'Cargando la evolución del peso' }),
    ).toBeInTheDocument()
  })

  it('por defecto pide todo el historial, de a 100, y dibuja los registros', async () => {
    routeWeights()

    renderCard()

    expect(
      await screen.findByRole('img', { name: 'Evolución del peso' }),
    ).toBeInTheDocument()
    expect(getWeights).toHaveBeenCalledWith(ATHLETE_ID, {
      from: undefined,
      to: undefined,
      page: 0,
      size: 100,
    })
    expect(screen.getByRole('radio', { name: 'Todo' })).toBeChecked()
    expect(searchOf()).toBe('')
  })

  it('pide todas las páginas del rango antes de dibujar', async () => {
    const first = weightRecord({ id: 'a', date: '2026-11-06', weightKg: 72.5 })
    const second = weightRecord({ id: 'b', date: '2026-11-01', weightKg: 73.1 })
    vi.mocked(getWeights).mockImplementation(
      async (_athleteId: string, query: WeightsQuery = {}) => {
        if (query.size === 10) return weightsPage([first, second])
        if (query.page === 1)
          return weightsPage([second], { page: 1, totalPages: 2 })
        return weightsPage([first], { page: 0, totalPages: 2 })
      },
    )

    renderCard('/progress?from=2026-10-01&to=2026-11-06')

    const table = await screen.findByRole('table', {
      name: 'Peso por día en el rango elegido',
    })
    expect(table.querySelectorAll('tbody tr')).toHaveLength(2)
  })

  it('con un solo registro muestra el punto y la explicación', async () => {
    routeWeights([today])

    const { container } = renderCard()

    await screen.findByRole('img', { name: 'Evolución del peso' })
    expect(container.querySelectorAll('circle')).toHaveLength(1)
    expect(
      screen.getByText(
        'Con un solo registro se ve el punto. Cargá otro día para ver la línea.',
      ),
    ).toBeInTheDocument()
  })
})

describe('WeightEvolutionCard · rango', () => {
  it('un atajo cambia la URL y pide solo ese rango', async () => {
    const user = userEvent.setup()
    routeWeights()
    renderCard()
    await screen.findByRole('img', { name: 'Evolución del peso' })

    await user.click(screen.getByRole('radio', { name: '30 días' }))

    await waitFor(() =>
      expect(searchOf()).toBe('?from=2026-10-07&to=2026-11-06'),
    )
    expect(getWeights).toHaveBeenCalledWith(ATHLETE_ID, {
      from: '2026-10-07',
      to: '2026-11-06',
      page: 0,
      size: 100,
    })
    expect(screen.getByRole('radio', { name: '30 días' })).toBeChecked()
    // el atajo elegido no abre el formulario de fechas
    expect(
      screen.queryByRole('form', { name: 'Rango personalizado' }),
    ).not.toBeInTheDocument()
  })

  it('"Todo" quita las fechas de la URL', async () => {
    const user = userEvent.setup()
    routeWeights()
    renderCard('/progress?from=2026-10-07&to=2026-11-06')
    await screen.findByRole('img', { name: 'Evolución del peso' })

    await user.click(screen.getByRole('radio', { name: 'Todo' }))

    await waitFor(() => expect(searchOf()).toBe(''))
  })

  it('un rango de la URL que coincide con un atajo marca ese atajo', async () => {
    routeWeights()
    renderCard('/progress?from=2026-08-06&to=2026-11-06')

    expect(await screen.findByRole('radio', { name: '3 meses' })).toBeChecked()
  })

  it('un rango propio aplica sus fechas desde el formulario', async () => {
    const user = userEvent.setup()
    routeWeights()
    renderCard()
    await screen.findByRole('img', { name: 'Evolución del peso' })

    await user.click(screen.getByRole('radio', { name: 'Personalizado' }))
    const form = screen.getByRole('form', { name: 'Rango personalizado' })
    fireEvent.change(within(form).getByLabelText('Desde'), {
      target: { value: '2026-11-01' },
    })
    fireEvent.change(within(form).getByLabelText('Hasta'), {
      target: { value: '2026-11-01' },
    })
    await user.click(
      within(form).getByRole('button', { name: 'Aplicar rango' }),
    )

    await waitFor(() =>
      expect(searchOf()).toBe('?from=2026-11-01&to=2026-11-01'),
    )
    expect(
      await screen.findByRole('table', {
        name: 'Peso por día en el rango elegido',
      }),
    ).toBeInTheDocument()
  })

  it('"desde" posterior a "hasta" no cambia la URL ni pide datos: marca el campo', async () => {
    const user = userEvent.setup()
    routeWeights()
    renderCard()
    await screen.findByRole('img', { name: 'Evolución del peso' })
    vi.mocked(getWeights).mockClear()

    await user.click(screen.getByRole('radio', { name: 'Personalizado' }))
    const form = screen.getByRole('form', { name: 'Rango personalizado' })
    fireEvent.change(within(form).getByLabelText('Desde'), {
      target: { value: '2026-11-05' },
    })
    fireEvent.change(within(form).getByLabelText('Hasta'), {
      target: { value: '2026-11-01' },
    })
    await user.click(
      within(form).getByRole('button', { name: 'Aplicar rango' }),
    )

    expect(
      within(form).getByText(
        'La fecha desde no puede ser posterior a la fecha hasta',
      ),
    ).toBeInTheDocument()
    expect(within(form).getByLabelText('Desde')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(within(form).getByLabelText('Desde')).toHaveFocus()
    expect(searchOf()).toBe('')
    expect(getWeights).not.toHaveBeenCalled()
  })

  it('un rango inválido en la URL se explica y no se pide a la API', async () => {
    routeWeights()

    renderCard('/progress?from=2026-11-02&to=2026-11-01')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La fecha desde no puede ser posterior a la fecha hasta',
    )
    expect(getWeights).not.toHaveBeenCalledWith(
      ATHLETE_ID,
      expect.objectContaining({ from: '2026-11-02' }),
    )
  })

  it('una fecha que no existe en la URL también se rechaza', async () => {
    routeWeights()

    renderCard('/progress?from=2026-02-30')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La fecha desde no es válida',
    )
  })
})

describe('WeightEvolutionCard · estados', () => {
  it('sin ningún registro ofrece cargar el peso y enfoca el campo', async () => {
    const user = userEvent.setup()
    routeWeights([], [])
    renderCard()

    expect(
      await screen.findByText('Todavía no hay datos para graficar'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cargar mi peso' }))

    expect(screen.getByLabelText('Peso de prueba')).toHaveFocus()
  })

  it('con registros fuera del rango, lo dice sin ofrecer cargar', async () => {
    routeWeights([today, older])

    renderCard('/progress?from=2026-01-01&to=2026-01-31')

    expect(
      await screen.findByText('No hay registros en este rango'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Cargar mi peso' }),
    ).not.toBeInTheDocument()
  })

  it('un 400 del backend muestra su texto y no ofrece reintentar', async () => {
    vi.mocked(getWeights).mockImplementation(
      async (_athleteId: string, query: WeightsQuery = {}) => {
        if (query.size === 10) return weightsPage([today])
        throw new ApiError('La solicitud tiene campos inválidos', 400, {
          fieldErrors: [
            {
              field: 'from',
              message: 'La fecha desde no puede ser posterior a la fecha hasta',
            },
          ],
        })
      },
    )

    renderCard('/progress?from=2026-10-01&to=2026-11-01')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La fecha desde no puede ser posterior a la fecha hasta',
    )
    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument()
  })

  it('un error de red o del servidor muestra "Reintentar" y vuelve a pedir', async () => {
    const user = userEvent.setup()
    vi.mocked(getWeights).mockImplementation(
      async (_athleteId: string, query: WeightsQuery = {}) => {
        if (query.size === 10) return weightsPage([today])
        throw new ApiError('El servidor no responde', 503)
      },
    )
    renderCard()

    const retry = await screen.findByRole('button', { name: 'Reintentar' })
    vi.mocked(getWeights).mockClear()
    vi.mocked(getWeights).mockResolvedValue(weightsPage([today]))
    await user.click(retry)

    expect(
      await screen.findByRole('img', { name: 'Evolución del peso' }),
    ).toBeInTheDocument()
    expect(getWeights).toHaveBeenCalled()
  })
})
