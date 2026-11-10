import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import type { WeightRecord, WeightsQuery } from '../../lib/weights'
import { createWeight } from '../../lib/weights/create-weight'
import { getWeights } from '../../lib/weights/get-weights'
import { updateWeight } from '../../lib/weights/update-weight'
import { session } from '../../test/auth-fixtures'
import { weightRecord, weightsPage } from '../../test/weight-fixtures'
import { ProgressPage } from './ProgressPage'

vi.mock('../../lib/weights/get-weights', () => ({ getWeights: vi.fn() }))
vi.mock('../../lib/weights/create-weight', () => ({ createWeight: vi.fn() }))
vi.mock('../../lib/weights/update-weight', () => ({ updateWeight: vi.fn() }))

const ATHLETE_ID = session('ATHLETE').user.id

const today = weightRecord()
const older = weightRecord({
  id: '0a9b8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d',
  date: '2026-11-01',
  weightKg: 73.1,
  comment: null,
})

// GET de la lista y del registro de un día (from = to), sobre los registros dados
const routeWeights = (records: WeightRecord[] = [today, older]) =>
  vi
    .mocked(getWeights)
    .mockImplementation(async (_athleteId: string, query: WeightsQuery = {}) =>
      query.from
        ? weightsPage(records.filter(({ date }) => date === query.from))
        : weightsPage(records),
    )

const renderPage = () =>
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
      <ProgressPage />
    </QueryClientProvider>,
  )

const latestList = () =>
  screen.findByRole('list', { name: 'Últimos registros' })

const dateInput = () => screen.getByLabelText(/^Fecha/)
const weightInput = () => screen.getByRole('spinbutton', { name: /^Peso/ })
const commentInput = () => screen.getByRole('textbox', { name: 'Comentario' })
const entryHeading = (name: string) =>
  screen.getByRole('heading', { name, level: 2 })

beforeEach(() => {
  vi.mocked(getWeights).mockReset()
  vi.mocked(createWeight).mockReset()
  vi.mocked(updateWeight).mockReset()
  saveSession(session('ATHLETE'))
  // 23:30 del 6/11 en Argentina: en UTC ya es el 7. Solo se fija la fecha, los timers son reales
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-07T02:30:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ProgressPage · últimos registros', () => {
  it('muestra un skeleton y después los registros del atleta, el más reciente primero (CA-2)', async () => {
    routeWeights()

    renderPage()

    expect(
      screen.getByRole('status', { name: 'Cargando registros de peso' }),
    ).toBeInTheDocument()
    const items = within(await latestList()).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('72,5 kg')
    expect(items[0]).toHaveTextContent('En ayunas')
    expect(
      within(items[0]).getByText('6 de noviembre de 2026'),
    ).toHaveAttribute('datetime', '2026-11-06')
    // el registro de hoy (en Argentina) se marca
    expect(within(items[0]).getByText('Hoy')).toBeInTheDocument()
    expect(items[1]).toHaveTextContent('73,1 kg')
    expect(items[1]).toHaveTextContent('1 de noviembre de 2026')
    expect(within(items[1]).queryByText('Hoy')).not.toBeInTheDocument()
    expect(screen.getByText('2 registros')).toBeInTheDocument()
    expect(getWeights).toHaveBeenCalledWith(ATHLETE_ID, { size: 10 })
  })

  it('si hay más registros de los que muestra, lo aclara', async () => {
    vi.mocked(getWeights).mockResolvedValue(
      weightsPage([today, older], { totalElements: 23, totalPages: 3 }),
    )

    renderPage()

    await latestList()
    expect(screen.getByText('Los 2 más recientes de 23')).toBeInTheDocument()
  })

  it('sin registros muestra el estado vacío', async () => {
    routeWeights([])

    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'Todavía no registraste tu peso',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('si falla la carga muestra el error y permite reintentar', async () => {
    vi.mocked(getWeights)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValue(weightsPage([today]))
    const user = userEvent.setup()

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    const items = within(await latestList()).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('ProgressPage · registrar peso', () => {
  it('la fecha arranca en hoy de Argentina aunque en UTC ya sea mañana, y no deja elegir días futuros', async () => {
    routeWeights([])

    renderPage()

    expect(entryHeading('Registrar peso')).toBeInTheDocument()
    expect(dateInput()).toHaveValue('2026-11-06')
    expect(dateInput()).toHaveAttribute('max', '2026-11-06')
    expect(weightInput()).toHaveValue(null)
    expect(commentInput()).toHaveValue('')
  })

  it('valida antes de enviar y enfoca el primer campo con error (CE-1)', async () => {
    routeWeights([])
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Registrar peso' }))
    expect(
      await screen.findByText('El peso es obligatorio'),
    ).toBeInTheDocument()
    expect(weightInput()).toHaveFocus()
    expect(weightInput()).toHaveAttribute('aria-invalid', 'true')

    await user.type(weightInput(), '19.5')
    await user.tab()
    expect(
      await screen.findByText('El peso debe estar entre 20 y 300 kg'),
    ).toBeInTheDocument()

    await user.clear(weightInput())
    await user.type(weightInput(), '72.555')
    await user.tab()
    expect(
      await screen.findByText('El peso admite hasta 3 enteros y 2 decimales'),
    ).toBeInTheDocument()

    expect(createWeight).not.toHaveBeenCalled()
  })

  it('no acepta una fecha futura en hora de Argentina (CE-2)', async () => {
    routeWeights([])
    const user = userEvent.setup()
    renderPage()

    fireEvent.change(dateInput(), { target: { value: '2026-11-07' } })
    await user.type(weightInput(), '72.5')
    await user.click(screen.getByRole('button', { name: 'Registrar peso' }))

    expect(
      await screen.findByText('La fecha no puede ser futura'),
    ).toBeInTheDocument()
    expect(dateInput()).toHaveFocus()
    expect(createWeight).not.toHaveBeenCalled()
  })

  it('registra el peso, lo anuncia y deja el formulario listo (CA-1)', async () => {
    vi.mocked(getWeights)
      .mockResolvedValueOnce(weightsPage([older]))
      .mockResolvedValue(weightsPage([today, older]))
    vi.mocked(createWeight).mockResolvedValue(today)
    const user = userEvent.setup()
    renderPage()
    await latestList()

    await user.type(weightInput(), '72.5')
    await user.type(commentInput(), '  En ayunas  ')
    await user.click(screen.getByRole('button', { name: 'Registrar peso' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent(
      'Registraste 72,5 kg para el 6 de noviembre de 2026.',
    )
    expect(document.activeElement).toContainElement(notice)
    expect(createWeight).toHaveBeenCalledWith(ATHLETE_ID, {
      date: '2026-11-06',
      weightKg: 72.5,
      comment: 'En ayunas',
    })
    expect(dateInput()).toHaveValue('2026-11-06')
    expect(weightInput()).toHaveValue(null)
    expect(commentInput()).toHaveValue('')
    const items = within(await latestList()).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('72,5 kg')
  })

  it('sin comentario lo manda en null', async () => {
    routeWeights([])
    vi.mocked(createWeight).mockResolvedValue(
      weightRecord({ date: '2026-11-05', weightKg: 80, comment: null }),
    )
    const user = userEvent.setup()
    renderPage()

    fireEvent.change(dateInput(), { target: { value: '2026-11-05' } })
    await user.type(weightInput(), '80')
    await user.type(commentInput(), '   ')
    await user.click(screen.getByRole('button', { name: 'Registrar peso' }))

    expect(
      await screen.findByText(
        'Registraste 80 kg para el 5 de noviembre de 2026.',
      ),
    ).toBeInTheDocument()
    expect(createWeight).toHaveBeenCalledWith(ATHLETE_ID, {
      date: '2026-11-05',
      weightKg: 80,
      comment: null,
    })
  })

  it('muestra en su campo los errores de validación del backend', async () => {
    routeWeights([])
    vi.mocked(createWeight).mockRejectedValue(
      new ApiError('La solicitud tiene campos inválidos', 400, {
        fieldErrors: [
          { field: 'date', message: 'La fecha no puede ser futura' },
        ],
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(weightInput(), '72.5')
    await user.click(screen.getByRole('button', { name: 'Registrar peso' }))

    expect(
      await screen.findByText('La fecha no puede ser futura'),
    ).toBeInTheDocument()
    expect(dateInput()).toHaveAttribute('aria-invalid', 'true')
    expect(dateInput()).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('un error sin campos se muestra sobre los botones y recibe el foco', async () => {
    routeWeights([])
    vi.mocked(createWeight).mockRejectedValue(
      new ApiError(
        'Ocurrió un error inesperado. Intente nuevamente más tarde',
        500,
      ),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(weightInput(), '72.5')
    await user.click(screen.getByRole('button', { name: 'Registrar peso' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Ocurrió un error inesperado. Intente nuevamente más tarde',
    )
    expect(document.activeElement).toContainElement(alert)
    // los valores cargados no se pierden
    expect(weightInput()).toHaveValue(72.5)
  })
})

describe('ProgressPage · editar un registro', () => {
  it('abre el registro en el formulario, guarda los cambios y vuelve al alta (CA-3)', async () => {
    routeWeights()
    vi.mocked(updateWeight).mockResolvedValue({
      ...older,
      weightKg: 72.9,
      comment: 'Después de entrenar',
    })
    const user = userEvent.setup()
    renderPage()
    await latestList()

    await user.click(
      screen.getByRole('button', {
        name: 'Editar el registro del 1 de noviembre de 2026',
      }),
    )

    expect(entryHeading('Editar registro')).toHaveFocus()
    expect(screen.getByText(/Del 1 de noviembre de 2026/)).toBeInTheDocument()
    expect(dateInput()).toHaveValue('2026-11-01')
    expect(weightInput()).toHaveValue(73.1)
    expect(commentInput()).toHaveValue('')
    const items = within(await latestList()).getAllByRole('listitem')
    expect(items[1]).toHaveTextContent('Editando')

    await user.clear(weightInput())
    await user.type(weightInput(), '72.9')
    await user.type(commentInput(), 'Después de entrenar')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent(
      'Guardaste los cambios del registro del 1 de noviembre de 2026.',
    )
    expect(document.activeElement).toContainElement(notice)
    expect(updateWeight).toHaveBeenCalledWith(ATHLETE_ID, older.id, {
      date: '2026-11-01',
      weightKg: 72.9,
      comment: 'Después de entrenar',
    })
    expect(entryHeading('Registrar peso')).toBeInTheDocument()
    expect(dateInput()).toHaveValue('2026-11-06')
    expect(createWeight).not.toHaveBeenCalled()
  })

  it('cancelar vuelve al alta sin guardar y devuelve el foco al botón que abrió la edición', async () => {
    routeWeights()
    const user = userEvent.setup()
    renderPage()
    await latestList()

    await user.click(
      screen.getByRole('button', {
        name: 'Editar el registro del 6 de noviembre de 2026',
      }),
    )
    await user.clear(weightInput())
    await user.type(weightInput(), '90')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(entryHeading('Registrar peso')).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Editar el registro del 6 de noviembre de 2026',
      }),
    ).toHaveFocus()
    expect(weightInput()).toHaveValue(null)
    expect(updateWeight).not.toHaveBeenCalled()
  })
})

describe('ProgressPage · día ya registrado (409)', () => {
  const conflict = () =>
    new ApiError('Ya existe un registro de peso para el 06/11/2026', 409)

  it('avisa que ya registró ese día y ofrece editar ese registro (CE-3)', async () => {
    routeWeights()
    vi.mocked(createWeight).mockRejectedValue(conflict())
    vi.mocked(updateWeight).mockResolvedValue({ ...today, weightKg: 73 })
    const user = userEvent.setup()
    renderPage()
    await latestList()

    await user.type(weightInput(), '73')
    await user.click(screen.getByRole('button', { name: 'Registrar peso' }))

    const notice = await screen.findByRole('note')
    expect(notice).toHaveTextContent('Ya registraste tu peso ese día.')
    expect(
      await within(notice).findByText(
        /El 6 de noviembre de 2026 tiene un registro de 72,5 kg/,
      ),
    ).toBeInTheDocument()
    expect(document.activeElement).toContainElement(notice)
    expect(getWeights).toHaveBeenCalledWith(ATHLETE_ID, {
      from: '2026-11-06',
      to: '2026-11-06',
      size: 1,
    })
    // lo cargado no se pierde: el atleta decide
    expect(weightInput()).toHaveValue(73)

    await user.click(
      within(notice).getByRole('button', { name: 'Editar ese registro' }),
    )

    expect(entryHeading('Editar registro')).toHaveFocus()
    expect(dateInput()).toHaveValue('2026-11-06')
    expect(weightInput()).toHaveValue(72.5)
    expect(commentInput()).toHaveValue('En ayunas')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()

    await user.clear(weightInput())
    await user.type(weightInput(), '73')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText(
        'Guardaste los cambios del registro del 6 de noviembre de 2026.',
      ),
    ).toBeInTheDocument()
    expect(updateWeight).toHaveBeenCalledWith(ATHLETE_ID, today.id, {
      date: '2026-11-06',
      weightKg: 73,
      comment: 'En ayunas',
    })
  })

  it('al editar, mover un registro a un día ocupado ofrece editar el otro', async () => {
    routeWeights()
    vi.mocked(updateWeight).mockRejectedValue(conflict())
    const user = userEvent.setup()
    renderPage()
    await latestList()

    await user.click(
      screen.getByRole('button', {
        name: 'Editar el registro del 1 de noviembre de 2026',
      }),
    )
    fireEvent.change(dateInput(), { target: { value: '2026-11-06' } })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const notice = await screen.findByRole('note')
    await user.click(
      await within(notice).findByRole('button', {
        name: 'Editar ese registro',
      }),
    )

    expect(entryHeading('Editar registro')).toHaveFocus()
    expect(screen.getByText(/Del 6 de noviembre de 2026/)).toBeInTheDocument()
    expect(weightInput()).toHaveValue(72.5)
  })

  it('si el registro de ese día ya no está, avisa que se puede volver a guardar', async () => {
    vi.mocked(getWeights).mockImplementation(async (_id, query = {}) =>
      query.from ? weightsPage([]) : weightsPage([older]),
    )
    vi.mocked(createWeight).mockRejectedValue(conflict())
    const user = userEvent.setup()
    renderPage()

    await user.type(weightInput(), '73')
    await user.click(screen.getByRole('button', { name: 'Registrar peso' }))

    expect(
      await screen.findByText(
        'El registro del 6 de noviembre de 2026 ya no existe. Volvé a guardar.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Editar ese registro' }),
    ).not.toBeInTheDocument()
  })

  it('si falla la búsqueda del registro del día, permite reintentar', async () => {
    let dayLookups = 0
    vi.mocked(getWeights).mockImplementation(async (_id, query = {}) => {
      if (!query.from) return weightsPage([today])
      dayLookups += 1
      if (dayLookups === 1)
        throw new ApiError('No se pudo conectar con el servidor', 0)
      return weightsPage([today])
    })
    vi.mocked(createWeight).mockRejectedValue(conflict())
    const user = userEvent.setup()
    renderPage()

    await user.type(weightInput(), '73')
    await user.click(screen.getByRole('button', { name: 'Registrar peso' }))

    const notice = await screen.findByRole('note')
    expect(
      await within(notice).findByText(/No se pudo traer ese registro/),
    ).toBeInTheDocument()
    await user.click(within(notice).getByRole('button', { name: 'Reintentar' }))

    expect(
      await within(notice).findByRole('button', {
        name: 'Editar ese registro',
      }),
    ).toBeInTheDocument()
  })
})
