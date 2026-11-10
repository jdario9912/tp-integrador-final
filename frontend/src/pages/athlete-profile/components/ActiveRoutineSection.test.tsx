import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { assignRoutine } from '../../../lib/assignments/assign-routine'
import { getAssignments } from '../../../lib/assignments/get-assignments'
import { saveSession } from '../../../lib/auth'
import { MemoryRouter } from '../../../lib/navigation'
import {
  assignmentsPage,
  routineAssignment,
} from '../../../test/assignment-fixtures'
import { session } from '../../../test/auth-fixtures'
import { createdRoutine, routinesPage } from '../../../test/routine-fixtures'
import { getRoutineOptions } from '../actions/get-routine-options'
import { ActiveRoutineSection } from './ActiveRoutineSection'

vi.mock('../../../lib/assignments/get-assignments', () => ({
  getAssignments: vi.fn(),
}))
vi.mock('../../../lib/assignments/assign-routine', () => ({
  assignRoutine: vi.fn(),
}))
vi.mock('../actions/get-routine-options', () => ({
  getRoutineOptions: vi.fn(),
}))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'
const volume = createdRoutine()
const strength = createdRoutine({
  id: '11111111-2222-4333-8444-555555555555',
  name: 'Fuerza',
})
const active = routineAssignment()

const renderSection = (athleteActive = true) =>
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
      <MemoryRouter>
        <ActiveRoutineSection
          athleteId={ATHLETE_ID}
          athleteActive={athleteActive}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const section = () => screen.getByRole('region', { name: 'Rutina activa' })
const routineSelect = () =>
  within(section()).getByRole('combobox', { name: /Rutina/ })

beforeEach(() => {
  vi.mocked(getAssignments).mockReset()
  vi.mocked(assignRoutine).mockReset()
  vi.mocked(getRoutineOptions).mockReset()
  vi.mocked(getRoutineOptions).mockResolvedValue(
    routinesPage([volume, strength]),
  )
  saveSession(session('COACH'))
})

describe('ActiveRoutineSection', () => {
  it('sin rutina activa lo indica y permite asignar una', async () => {
    vi.mocked(getAssignments).mockResolvedValue(assignmentsPage([]))

    renderSection()

    expect(
      screen.getByRole('status', { name: 'Cargando rutina activa' }),
    ).toBeInTheDocument()
    expect(
      await within(section()).findByRole('heading', {
        name: 'Sin rutina asignada',
      }),
    ).toBeInTheDocument()
    expect(
      within(section()).getByRole('button', { name: 'Asignar rutina' }),
    ).toBeEnabled()
    expect(getAssignments).toHaveBeenCalledWith(ATHLETE_ID, {
      page: 0,
      size: 10,
    })
  })

  it('con una inactiva primero no muestra ninguna como activa', async () => {
    vi.mocked(getAssignments).mockResolvedValue(
      assignmentsPage([routineAssignment({ active: false })]),
    )

    renderSection()

    expect(
      await within(section()).findByText('Sin rutina asignada'),
    ).toBeInTheDocument()
  })

  it('muestra la rutina activa con su link y la fecha de asignación', async () => {
    vi.mocked(getAssignments).mockResolvedValue(assignmentsPage([active]))

    renderSection()

    expect(
      await within(section()).findByRole('link', { name: 'Fase de volumen' }),
    ).toHaveAttribute('href', `/routines/${active.routineId}`)
    expect(section()).toHaveTextContent('Asignada el 8 de noviembre de 2026.')
    expect(
      within(section()).getByRole('button', { name: 'Cambiar rutina' }),
    ).toBeEnabled()
  })

  it('con la cuenta desactivada no permite asignar', async () => {
    vi.mocked(getAssignments).mockResolvedValue(assignmentsPage([]))

    renderSection(false)

    expect(
      await within(section()).findByRole('button', { name: 'Asignar rutina' }),
    ).toBeDisabled()
    expect(section()).toHaveTextContent(
      'La cuenta está desactivada: reactivala para asignarle una rutina.',
    )
  })

  it('asigna la rutina elegida y muestra la nueva activa', async () => {
    vi.mocked(getAssignments)
      .mockResolvedValueOnce(assignmentsPage([]))
      .mockResolvedValue(assignmentsPage([active]))
    vi.mocked(assignRoutine).mockResolvedValue(active)

    renderSection()

    await userEvent.click(
      await within(section()).findByRole('button', { name: 'Asignar rutina' }),
    )
    await userEvent.selectOptions(
      await within(section()).findByRole('combobox', { name: /Rutina/ }),
      volume.id,
    )
    await userEvent.click(
      within(section()).getByRole('button', { name: 'Asignar' }),
    )

    expect(
      await within(section()).findByText(
        'Asignaste la rutina Fase de volumen.',
      ),
    ).toBeInTheDocument()
    expect(assignRoutine).toHaveBeenCalledWith(ATHLETE_ID, {
      routineId: volume.id,
      replaceActive: false,
    })
    expect(
      within(section()).getByRole('link', { name: 'Fase de volumen' }),
    ).toBeInTheDocument()
    expect(within(section()).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('la rutina activa aparece deshabilitada en el selector', async () => {
    vi.mocked(getAssignments).mockResolvedValue(assignmentsPage([active]))

    renderSection()

    await userEvent.click(
      await within(section()).findByRole('button', { name: 'Cambiar rutina' }),
    )

    expect(
      await within(section()).findByRole('option', {
        name: 'Fase de volumen (activa)',
      }),
    ).toBeDisabled()
    expect(
      within(section()).getByRole('option', { name: 'Fuerza' }),
    ).toBeEnabled()
  })

  it('ante el 409 pide confirmar y reemplaza con replaceActive', async () => {
    const replaced = routineAssignment({
      id: 'a2',
      routineId: strength.id,
      routineName: 'Fuerza',
      assignmentDate: '2026-11-10',
    })
    vi.mocked(getAssignments)
      .mockResolvedValueOnce(assignmentsPage([active]))
      .mockResolvedValue(
        assignmentsPage([replaced, { ...active, active: false }]),
      )
    vi.mocked(assignRoutine)
      .mockRejectedValueOnce(
        new ApiError(
          'El atleta ya tiene asignada la rutina «Fase de volumen». Confirme el reemplazo para asignar la nueva',
          409,
        ),
      )
      .mockResolvedValueOnce(replaced)

    renderSection()

    await userEvent.click(
      await within(section()).findByRole('button', { name: 'Cambiar rutina' }),
    )
    await userEvent.selectOptions(
      await within(section()).findByRole('combobox', { name: /Rutina/ }),
      strength.id,
    )
    await userEvent.click(
      within(section()).getByRole('button', { name: 'Asignar' }),
    )

    const dialog = await screen.findByRole('dialog', {
      name: '¿Reemplazar la rutina activa?',
    })
    expect(dialog).toHaveTextContent(
      'El atleta ya tiene asignada la rutina «Fase de volumen».',
    )
    // el 409 no se muestra como error
    expect(within(section()).queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Reemplazar' }),
    )

    expect(
      await within(section()).findByText('Asignaste la rutina Fuerza.'),
    ).toBeInTheDocument()
    expect(assignRoutine).toHaveBeenLastCalledWith(ATHLETE_ID, {
      routineId: strength.id,
      replaceActive: true,
    })
    expect(
      within(section()).getByRole('link', { name: 'Fuerza' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '¿Reemplazar la rutina activa?' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('cancelar el reemplazo no reenvía y deja el formulario abierto', async () => {
    vi.mocked(getAssignments).mockResolvedValue(assignmentsPage([active]))
    vi.mocked(assignRoutine).mockRejectedValue(
      new ApiError(
        'El atleta ya tiene asignada la rutina «Fase de volumen».',
        409,
      ),
    )

    renderSection()

    await userEvent.click(
      await within(section()).findByRole('button', { name: 'Cambiar rutina' }),
    )
    await userEvent.selectOptions(
      await within(section()).findByRole('combobox', { name: /Rutina/ }),
      strength.id,
    )
    await userEvent.click(
      within(section()).getByRole('button', { name: 'Asignar' }),
    )
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    )

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(assignRoutine).toHaveBeenCalledOnce()
    expect(routineSelect()).toBeInTheDocument()
    expect(
      within(section()).getByRole('link', { name: 'Fase de volumen' }),
    ).toBeInTheDocument()
  })

  it('el 422 por rutina incompleta muestra el mensaje y el link a la estructura', async () => {
    vi.mocked(getAssignments).mockResolvedValue(assignmentsPage([]))
    vi.mocked(assignRoutine).mockRejectedValue(
      new ApiError(
        'La rutina no tiene días o tiene días sin ejercicios. Complete su estructura antes de asignarla',
        422,
      ),
    )

    renderSection()

    await userEvent.click(
      await within(section()).findByRole('button', { name: 'Asignar rutina' }),
    )
    await userEvent.selectOptions(
      await within(section()).findByRole('combobox', { name: /Rutina/ }),
      strength.id,
    )
    await userEvent.click(
      within(section()).getByRole('button', { name: 'Asignar' }),
    )

    const alert = await within(section()).findByRole('alert')
    expect(alert).toHaveTextContent(
      'La rutina no tiene días o tiene días sin ejercicios.',
    )
    expect(
      within(alert).getByRole('link', { name: 'Configurar estructura' }),
    ).toHaveAttribute('href', `/routines/${strength.id}/structure`)
  })

  it('un 403 muestra el mensaje sin link a la estructura', async () => {
    vi.mocked(getAssignments).mockResolvedValue(assignmentsPage([]))
    vi.mocked(assignRoutine).mockRejectedValue(
      new ApiError('No tiene permisos para acceder a esta rutina', 403),
    )

    renderSection()

    await userEvent.click(
      await within(section()).findByRole('button', { name: 'Asignar rutina' }),
    )
    await userEvent.selectOptions(
      await within(section()).findByRole('combobox', { name: /Rutina/ }),
      strength.id,
    )
    await userEvent.click(
      within(section()).getByRole('button', { name: 'Asignar' }),
    )

    const alert = await within(section()).findByRole('alert')
    expect(alert).toHaveTextContent(
      'No tiene permisos para acceder a esta rutina',
    )
    expect(within(alert).queryByRole('link')).not.toBeInTheDocument()
  })

  it('cancelar cierra el formulario y descarta el error', async () => {
    vi.mocked(getAssignments).mockResolvedValue(assignmentsPage([]))
    vi.mocked(assignRoutine).mockRejectedValue(
      new ApiError('No tiene permisos para acceder a esta rutina', 403),
    )

    renderSection()

    await userEvent.click(
      await within(section()).findByRole('button', { name: 'Asignar rutina' }),
    )
    await userEvent.selectOptions(
      await within(section()).findByRole('combobox', { name: /Rutina/ }),
      strength.id,
    )
    await userEvent.click(
      within(section()).getByRole('button', { name: 'Asignar' }),
    )
    await within(section()).findByRole('alert')
    await userEvent.click(
      within(section()).getByRole('button', { name: 'Cancelar' }),
    )

    expect(within(section()).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(section()).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('si falla la carga muestra su error y permite reintentar', async () => {
    vi.mocked(getAssignments)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValue(assignmentsPage([active]))

    renderSection()

    expect(await within(section()).findByRole('alert')).toHaveTextContent(
      'No se pudo cargar la rutina activa.',
    )
    await userEvent.click(
      within(section()).getByRole('button', { name: 'Reintentar' }),
    )

    expect(
      await within(section()).findByRole('link', { name: 'Fase de volumen' }),
    ).toBeInTheDocument()
  })
})
