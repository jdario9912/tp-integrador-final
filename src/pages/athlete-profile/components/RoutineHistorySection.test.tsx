import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { getAssignments } from '../../../lib/assignments/get-assignments'
import { saveSession } from '../../../lib/auth'
import { MemoryRouter } from '../../../lib/navigation'
import {
  assignmentsPage,
  routineAssignment,
} from '../../../test/assignment-fixtures'
import { session } from '../../../test/auth-fixtures'
import { RoutineHistorySection } from './RoutineHistorySection'

vi.mock('../../../lib/assignments/get-assignments', () => ({
  getAssignments: vi.fn(),
}))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'

const active = routineAssignment()
const previous = routineAssignment({
  id: 'a2',
  routineId: '11111111-2222-4333-8444-555555555555',
  routineName: 'Fuerza',
  assignmentDate: '2026-10-01',
  active: false,
})

const renderSection = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <RoutineHistorySection athleteId={ATHLETE_ID} />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const section = () =>
  screen.getByRole('region', { name: 'Historial de rutinas' })

beforeEach(() => {
  vi.mocked(getAssignments).mockReset()
  saveSession(session('COACH'))
})

describe('RoutineHistorySection', () => {
  it('lista las asignaciones en el orden del backend con su estado', async () => {
    vi.mocked(getAssignments).mockResolvedValue(
      assignmentsPage([active, previous]),
    )

    renderSection()

    expect(
      screen.getByRole('status', { name: 'Cargando historial de rutinas' }),
    ).toBeInTheDocument()
    const items = await within(section()).findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Fase de volumen')
    expect(items[0]).toHaveTextContent('Asignada el 8 de noviembre de 2026')
    expect(items[0]).toHaveTextContent('Activa')
    expect(items[1]).toHaveTextContent('Fuerza')
    expect(items[1]).toHaveTextContent('Inactiva')
    expect(
      within(items[1]).getByRole('link', { name: 'Fuerza' }),
    ).toHaveAttribute('href', `/routines/${previous.routineId}`)
    expect(getAssignments).toHaveBeenCalledWith(ATHLETE_ID, {
      page: 0,
      size: 10,
    })
    // una sola página: sin paginación
    expect(
      within(section()).queryByRole('navigation', { name: 'Paginación' }),
    ).not.toBeInTheDocument()
  })

  it('pagina de a 10', async () => {
    vi.mocked(getAssignments).mockImplementation(async (_athleteId, query) =>
      query?.page === 0
        ? assignmentsPage([active], { totalElements: 11, totalPages: 2 })
        : assignmentsPage([previous], {
            page: 1,
            totalElements: 11,
            totalPages: 2,
          }),
    )

    renderSection()

    const pagination = await within(section()).findByRole('navigation', {
      name: 'Paginación',
    })
    expect(pagination).toHaveTextContent('Página 1 de 2 · 11 asignaciones')
    await userEvent.click(
      within(pagination).getByRole('button', { name: /Siguiente/ }),
    )

    expect(await within(section()).findByText('Fuerza')).toBeInTheDocument()
    expect(getAssignments).toHaveBeenLastCalledWith(ATHLETE_ID, {
      page: 1,
      size: 10,
    })
    expect(pagination).toHaveTextContent('Página 2 de 2')
  })

  it('sin asignaciones muestra el estado vacío', async () => {
    vi.mocked(getAssignments).mockResolvedValue(assignmentsPage([]))

    renderSection()

    expect(
      await within(section()).findByRole('heading', {
        name: 'Sin rutinas asignadas',
      }),
    ).toBeInTheDocument()
  })

  it('si falla la carga muestra su error y permite reintentar', async () => {
    vi.mocked(getAssignments)
      .mockRejectedValueOnce(
        new ApiError(
          'Ocurrió un error inesperado. Intente nuevamente más tarde',
          500,
        ),
      )
      .mockResolvedValue(assignmentsPage([active]))

    renderSection()

    expect(await within(section()).findByRole('alert')).toHaveTextContent(
      'No se pudo cargar el historial de rutinas.',
    )
    await userEvent.click(
      within(section()).getByRole('button', { name: 'Reintentar' }),
    )

    expect(
      await within(section()).findByText('Fase de volumen'),
    ).toBeInTheDocument()
  })
})
