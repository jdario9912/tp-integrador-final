import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { getAlerts } from '../../../lib/alerts/get-alerts'
import { getCoachDashboard } from '../../../lib/coach-dashboard/get-coach-dashboard'
import { athleteProfilePath, paths } from '../../../router/paths'
import { alert } from '../../../test/alert-fixtures'
import { session } from '../../../test/auth-fixtures'
import {
  ANA,
  coachDashboard,
  emptyCoachDashboard,
  LEO,
  SOL,
} from '../../../test/coach-dashboard-fixtures'
import { renderWithRouter } from '../dashboard-test-utils'
import { CoachDashboard } from './CoachDashboard'

vi.mock('../../../lib/coach-dashboard/get-coach-dashboard', () => ({
  getCoachDashboard: vi.fn(),
}))
// US-47: la tarjeta se prueba en CoachAlertsCard.test; por defecto, sin alertas
vi.mock('../../../lib/alerts/get-alerts', () => ({ getAlerts: vi.fn() }))

const card = (name: string) => screen.getByRole('region', { name })
// el número grande de la tarjeta
const countOf = (name: string) =>
  within(card(name)).getByText(/^\d+$/).textContent
// las tarjetas existen desde la carga (con su esqueleto): se espera a que ya no haya ninguno
const metricsLoaded = () =>
  waitFor(() => expect(screen.queryAllByRole('status')).toHaveLength(0))
const athletesOf = (name: string) =>
  within(within(card(name)).getByRole('list')).getAllByRole('link')

beforeEach(() => {
  saveSession(session('COACH'))
  vi.mocked(getCoachDashboard).mockReset()
  vi.mocked(getAlerts).mockReset()
  vi.mocked(getAlerts).mockResolvedValue([])
})

describe('CoachDashboard (US-11)', () => {
  it('muestra un esqueleto por métrica mientras carga', () => {
    vi.mocked(getCoachDashboard).mockReturnValue(new Promise(() => {}))

    renderWithRouter(<CoachDashboard />)

    expect(
      screen.getByRole('status', { name: 'Cargando atletas activos' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('status', { name: 'Cargando sesiones por revisar' }),
    ).toBeInTheDocument()
  })

  it('muestra las cuatro métricas con sus atletas en el orden de la API', async () => {
    vi.mocked(getCoachDashboard).mockResolvedValue(coachDashboard())

    renderWithRouter(<CoachDashboard />)

    await metricsLoaded()
    expect(countOf('Atletas activos')).toBe('3')
    expect(athletesOf('Atletas activos').map((a) => a.textContent)).toEqual([
      'Leo Gil',
      'Ana Gómez',
      'Sol Ruiz',
    ])
    expect(countOf('Sin rutina vigente')).toBe('1')
    expect(athletesOf('Sin rutina vigente')).toHaveLength(1)
    // el número son sesiones, no atletas; cada atleta dice cuántas tiene
    expect(countOf('Sesiones por revisar')).toBe('3')
    expect(card('Sesiones por revisar')).toHaveTextContent(
      'Leo Gil2 sesiones por revisar',
    )
    expect(card('Sesiones por revisar')).toHaveTextContent(
      'Ana Gómez1 sesión por revisar',
    )
    expect(countOf('Sin peso reciente')).toBe('2')
    expect(card('Sin peso reciente')).toHaveTextContent(
      'Ana GómezÚltimo registro: 1 de noviembre de 2026',
    )
    expect(card('Sin peso reciente')).toHaveTextContent(
      'Sol RuizNunca registró su peso',
    )
  })

  it('cada atleta lleva a su ficha', async () => {
    vi.mocked(getCoachDashboard).mockResolvedValue(coachDashboard())
    const user = userEvent.setup()

    const router = renderWithRouter(<CoachDashboard />)

    await metricsLoaded()
    const link = within(card('Sesiones por revisar')).getByRole('link', {
      name: 'Leo Gil',
    })
    expect(link).toHaveAttribute('href', athleteProfilePath(LEO.id))
    expect(
      within(card('Sin rutina vigente')).getByRole('link', {
        name: 'Sol Ruiz',
      }),
    ).toHaveAttribute('href', athleteProfilePath(SOL.id))

    await user.click(link)

    expect(router.state.location.pathname).toBe(athleteProfilePath(LEO.id))
    expect(screen.getByText('ficha del atleta')).toBeInTheDocument()
  })

  it('una métrica en 0 lo dice sin lista', async () => {
    vi.mocked(getCoachDashboard).mockResolvedValue(
      coachDashboard({
        withoutRoutine: { count: 0, athletes: [] },
        pendingReviewSessions: { count: 0, athletes: [] },
      }),
    )

    renderWithRouter(<CoachDashboard />)

    await metricsLoaded()
    const routine = card('Sin rutina vigente')
    expect(routine).toHaveTextContent(
      'Todos tus atletas activos tienen una rutina vigente.',
    )
    expect(within(routine).queryByRole('list')).not.toBeInTheDocument()
    expect(card('Sesiones por revisar')).toHaveTextContent(
      'No hay entrenamientos pendientes de revisión.',
    )
  })

  it('si una métrica falló, avisa en esa tarjeta y muestra el resto', async () => {
    vi.mocked(getCoachDashboard)
      .mockResolvedValueOnce(
        coachDashboard({
          withoutRecentWeight: null,
          warnings: ['withoutRecentWeight'],
        }),
      )
      .mockResolvedValue(coachDashboard())
    const user = userEvent.setup()

    renderWithRouter(<CoachDashboard />)

    await metricsLoaded()
    const weight = card('Sin peso reciente')
    expect(within(weight).getByRole('note')).toHaveTextContent(
      'No pudimos calcular esta métrica.',
    )
    expect(within(weight).queryByRole('list')).not.toBeInTheDocument()
    expect(countOf('Atletas activos')).toBe('3')
    expect(countOf('Sesiones por revisar')).toBe('3')
    expect(
      within(card('Atletas activos')).queryByRole('note'),
    ).not.toBeInTheDocument()

    await user.click(within(weight).getByRole('button', { name: 'Reintentar' }))

    expect(
      await within(card('Sin peso reciente')).findByRole('link', {
        name: 'Ana Gómez',
      }),
    ).toHaveAttribute('href', athleteProfilePath(ANA.id))
    expect(getCoachDashboard).toHaveBeenCalledTimes(2)
  })

  it('sin atletas invita a registrar uno', async () => {
    vi.mocked(getCoachDashboard).mockResolvedValue(emptyCoachDashboard())
    const user = userEvent.setup()

    const router = renderWithRouter(<CoachDashboard />)

    expect(
      await screen.findByRole('heading', {
        name: 'Todavía no tenés atletas activos',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Atletas activos' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Registrar atleta' }))

    expect(router.state.location.pathname).toBe(paths.newAthlete)
  })

  it('si falla el pedido entero, muestra el error y permite reintentar', async () => {
    vi.mocked(getCoachDashboard)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValue(coachDashboard())
    const user = userEvent.setup()

    renderWithRouter(<CoachDashboard />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await metricsLoaded()
    expect(countOf('Atletas activos')).toBe('3')
  })

  describe('alertas (US-47)', () => {
    const alertsCard = () => card('Requiere atención')

    it('van arriba de las métricas', async () => {
      vi.mocked(getCoachDashboard).mockResolvedValue(coachDashboard())
      vi.mocked(getAlerts).mockResolvedValue([alert()])

      renderWithRouter(<CoachDashboard />)

      expect(
        await within(alertsCard()).findByText(alert().message),
      ).toBeInTheDocument()
      await metricsLoaded()
      const regions = screen.getAllByRole('region')
      expect(regions[0]).toBe(alertsCard())
    })

    it('se muestran aunque la cartera esté vacía', async () => {
      vi.mocked(getCoachDashboard).mockResolvedValue(emptyCoachDashboard())

      renderWithRouter(<CoachDashboard />)

      expect(
        await screen.findByRole('heading', {
          name: 'Todavía no tenés atletas activos',
        }),
      ).toBeInTheDocument()
      expect(
        await within(alertsCard()).findByText('No tenés alertas pendientes.'),
      ).toBeInTheDocument()
    })

    it('se muestran aunque falle el pedido de las métricas, y al revés', async () => {
      vi.mocked(getCoachDashboard).mockRejectedValue(
        new ApiError('Error interno del servidor', 500),
      )
      vi.mocked(getAlerts).mockResolvedValue([alert()])

      renderWithRouter(<CoachDashboard />)

      expect(
        await within(alertsCard()).findByText(alert().message),
      ).toBeInTheDocument()
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Error interno del servidor',
      )
    })

    it('si fallan las alertas, las métricas se ven igual', async () => {
      vi.mocked(getCoachDashboard).mockResolvedValue(coachDashboard())
      vi.mocked(getAlerts).mockRejectedValue(
        new ApiError('No se pudieron calcular las alertas', 500),
      )

      renderWithRouter(<CoachDashboard />)

      expect(await within(alertsCard()).findByRole('alert')).toHaveTextContent(
        'No se pudieron calcular las alertas',
      )
      await metricsLoaded()
      expect(countOf('Atletas activos')).toBe('3')
    })
  })
})
