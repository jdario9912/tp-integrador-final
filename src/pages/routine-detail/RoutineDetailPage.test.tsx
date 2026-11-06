import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import {
  createMemoryRouter,
  RouterProvider,
  type RouterProviderProps,
} from '../../lib/navigation'
import { paths, routineDetailPath } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { createdRoutine } from '../../test/routine-fixtures'
import { getRoutine } from './actions/get-routine'
import { RoutineDetailPage } from './RoutineDetailPage'

vi.mock('./actions/get-routine', () => ({ getRoutine: vi.fn() }))

const volume = createdRoutine({
  goal: 'Hipertrofia',
  daysPerWeek: 4,
  durationWeeks: 8,
  description: 'Bloque de acumulación',
  isTemplate: true,
})

let router: RouterProviderProps['router']

const renderPage = (state?: unknown) => {
  router = createMemoryRouter(
    [
      { path: paths.routineDetail, element: <RoutineDetailPage /> },
      { path: paths.routines, element: <p>listado de rutinas</p> },
    ],
    { initialEntries: [{ pathname: routineDetailPath(volume.id), state }] },
  )
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(getRoutine).mockReset()
  saveSession(session('COACH'))
})

describe('RoutineDetailPage', () => {
  it('pide la rutina de la URL y muestra sus datos', async () => {
    vi.mocked(getRoutine).mockResolvedValue(volume)

    renderPage()

    expect(
      screen.getByRole('status', { name: 'Cargando rutina' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', {
        name: 'Fase de volumen',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(getRoutine).toHaveBeenCalledWith(volume.id)
    expect(screen.getByText(/Creada el 5 de noviembre de 2026/)).toBeVisible()
    expect(screen.getByText('Hipertrofia')).toBeInTheDocument()
    expect(screen.getByText('4 días por semana')).toBeInTheDocument()
    expect(screen.getByText('8 semanas')).toBeInTheDocument()
    expect(screen.getByText('Bloque de acumulación')).toBeInTheDocument()
    expect(screen.getByText('Sí')).toBeInTheDocument()
    // solo lectura
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('sin los opcionales muestra textos de reemplazo', async () => {
    vi.mocked(getRoutine).mockResolvedValue(createdRoutine())

    renderPage()

    expect(await screen.findByText('Sin objetivo')).toBeInTheDocument()
    expect(screen.getAllByText('Sin definir')).toHaveLength(2)
    expect(screen.getByText('Sin descripción')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.queryByText('Plantilla', { selector: 'span' })).toBeNull()
  })

  it('muestra el aviso del alta una sola vez', async () => {
    vi.mocked(getRoutine).mockResolvedValue(volume)

    renderPage({ notice: 'Creaste la rutina Fase de volumen.' })

    expect(
      await screen.findByText('Creaste la rutina Fase de volumen.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.state).toBeNull())
    expect(router.state.location.pathname).toBe(routineDetailPath(volume.id))
  })

  it.each([
    [404, 'No existe la rutina con id x', 'La rutina no existe'],
    [400, 'La solicitud tiene campos inválidos', 'La rutina no existe'],
    [
      403,
      'No tiene permisos para acceder a esta rutina',
      'No tenés acceso a esta rutina',
    ],
  ])(
    'ante un %i muestra el aviso sin reintentar',
    async (status, message, title) => {
      vi.mocked(getRoutine).mockRejectedValue(new ApiError(message, status))

      renderPage()

      expect(
        await screen.findByRole('heading', { name: title }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /Reintentar/ }),
      ).not.toBeInTheDocument()
      await userEvent.click(
        screen.getByRole('link', { name: 'Volver a rutinas' }),
      )
      expect(screen.getByText('listado de rutinas')).toBeInTheDocument()
    },
  )

  it('permite reintentar ante otros errores', async () => {
    vi.mocked(getRoutine)
      .mockRejectedValueOnce(new ApiError('No se pudo conectar', 0))
      .mockResolvedValueOnce(volume)

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar',
    )
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(
      await screen.findByRole('heading', { name: 'Fase de volumen' }),
    ).toBeInTheDocument()
  })
})
