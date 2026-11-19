import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAlerts } from '../../../lib/alerts/get-alerts'
import { handleAlert } from '../../../lib/alerts/handle-alert'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { athleteProfilePath } from '../../../router/paths'
import { alert } from '../../../test/alert-fixtures'
import { session } from '../../../test/auth-fixtures'
import { renderWithRouter } from '../dashboard-test-utils'
import { CoachAlertsCard } from './CoachAlertsCard'

vi.mock('../../../lib/alerts/get-alerts', () => ({ getAlerts: vi.fn() }))
vi.mock('../../../lib/alerts/handle-alert', () => ({ handleAlert: vi.fn() }))

const critical = alert({
  id: 'a1',
  athleteId: 'atleta-1',
  athleteName: 'Leo Gil',
  severity: 'CRITICAL',
  message: 'No registra entrenamientos hace 10 días.',
  generatedAt: '2026-11-14T02:00:00Z',
})
const warning = alert({
  id: 'a2',
  athleteId: 'atleta-2',
  athleteName: 'Ana Gómez',
  type: 'NO_WEIGHT_LOG',
  severity: 'WARNING',
  message: 'No registra su peso hace 9 días.',
})
const info = alert({
  id: 'a3',
  athleteId: 'atleta-3',
  athleteName: 'Sol Ruiz',
  type: 'PENDING_REVIEW',
  severity: 'INFO',
  message: 'Tiene 2 sesiones sin revisar.',
})

const card = () => screen.getByRole('region', { name: 'Requiere atención' })
const items = () => within(card()).getAllByRole('listitem')
const attend = (name: string) =>
  userEvent.click(
    within(card()).getByRole('button', {
      name: new RegExp(`Atender la alerta de ${name}`),
    }),
  )

beforeEach(() => {
  saveSession(session('COACH'))
  vi.mocked(getAlerts).mockReset()
  vi.mocked(handleAlert).mockReset()
})

describe('CoachAlertsCard (US-47)', () => {
  it('muestra un esqueleto mientras carga', () => {
    vi.mocked(getAlerts).mockReturnValue(new Promise(() => {}))

    renderWithRouter(<CoachAlertsCard />)

    expect(
      screen.getByRole('status', { name: 'Cargando las alertas' }),
    ).toBeInTheDocument()
  })

  it('lista las alertas en el orden de la API con severidad, mensaje y fecha', async () => {
    vi.mocked(getAlerts).mockResolvedValue([critical, warning, info])

    renderWithRouter(<CoachAlertsCard />)

    await within(card()).findByText(critical.message)
    expect(within(card()).getByText('3 pendientes')).toBeInTheDocument()
    const [first, second, third] = items()
    expect(first).toHaveTextContent('Leo Gil')
    expect(first).toHaveTextContent('Crítica')
    expect(first).toHaveTextContent('No registra entrenamientos hace 10 días.')
    // instante en la zona de la app: las 2 UTC del 14 son el 13 en Argentina
    expect(first).toHaveTextContent('Generada el 13 de noviembre de 2026')
    expect(second).toHaveTextContent('Advertencia')
    expect(third).toHaveTextContent('Info')
  })

  it('el nombre lleva a la ficha del atleta', async () => {
    vi.mocked(getAlerts).mockResolvedValue([critical])

    const router = renderWithRouter(<CoachAlertsCard />)
    await userEvent.click(
      await within(card()).findByRole('link', { name: 'Leo Gil' }),
    )

    expect(router.state.location.pathname).toBe(athleteProfilePath('atleta-1'))
  })

  it('sin alertas lo dice', async () => {
    vi.mocked(getAlerts).mockResolvedValue([])

    renderWithRouter(<CoachAlertsCard />)

    expect(
      await within(card()).findByText('No tenés alertas pendientes.'),
    ).toBeInTheDocument()
  })

  it('si falla la carga muestra el error y reintenta', async () => {
    vi.mocked(getAlerts)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValue([critical])

    renderWithRouter(<CoachAlertsCard />)

    expect(await within(card()).findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    await userEvent.click(
      within(card()).getByRole('button', { name: 'Reintentar' }),
    )

    expect(
      await within(card()).findByText(critical.message),
    ).toBeInTheDocument()
  })

  it('atender la quita de la lista y lo confirma', async () => {
    vi.mocked(getAlerts)
      .mockResolvedValueOnce([critical, warning])
      .mockResolvedValue([warning])
    vi.mocked(handleAlert).mockResolvedValue({
      ...critical,
      handledAt: '2026-11-15T10:00:00Z',
    })

    renderWithRouter(<CoachAlertsCard />)
    await within(card()).findByText(critical.message)
    await attend('Leo Gil')

    expect(await within(card()).findByRole('status')).toHaveTextContent(
      'Atendiste la alerta de Leo Gil.',
    )
    expect(vi.mocked(handleAlert).mock.calls[0][0]).toBe('a1')
    await waitFor(() => expect(items()).toHaveLength(1))
    expect(within(card()).getByText('1 pendiente')).toBeInTheDocument()
  })

  it('un 409 se toma como ya resuelta: avisa y refresca', async () => {
    vi.mocked(getAlerts).mockResolvedValueOnce([critical]).mockResolvedValue([])
    vi.mocked(handleAlert).mockRejectedValue(
      new ApiError('La alerta ya fue atendida', 409),
    )

    renderWithRouter(<CoachAlertsCard />)
    await within(card()).findByText(critical.message)
    await attend('Leo Gil')

    expect(await within(card()).findByRole('status')).toHaveTextContent(
      'La alerta de Leo Gil ya estaba atendida.',
    )
    expect(
      await within(card()).findByText('No tenés alertas pendientes.'),
    ).toBeInTheDocument()
  })

  it.each([
    [403, 'No tiene permisos sobre esta alerta'],
    [404, 'La alerta no existe'],
  ])(
    'un %i muestra el mensaje del backend y refresca',
    async (status, message) => {
      vi.mocked(getAlerts)
        .mockResolvedValueOnce([critical])
        .mockResolvedValue([])
      vi.mocked(handleAlert).mockRejectedValue(new ApiError(message, status))

      renderWithRouter(<CoachAlertsCard />)
      await within(card()).findByText(critical.message)
      await attend('Leo Gil')

      expect(await within(card()).findByRole('alert')).toHaveTextContent(
        message,
      )
      await waitFor(() => expect(getAlerts).toHaveBeenCalledTimes(2))
    },
  )
})
