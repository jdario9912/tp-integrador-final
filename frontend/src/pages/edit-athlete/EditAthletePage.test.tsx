import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
} from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import { athleteEditPath, paths } from '../../router/paths'
import { createdAthlete } from '../../test/athlete-fixtures'
import { session } from '../../test/auth-fixtures'
import { getAthlete } from './actions/get-athlete'
import { setAthleteActive } from './actions/set-athlete-active'
import { unlinkAthlete } from './actions/unlink-athlete'
import { updateAthlete } from './actions/update-athlete'
import { EditAthletePage } from './EditAthletePage'

vi.mock('./actions/get-athlete', () => ({ getAthlete: vi.fn() }))
vi.mock('./actions/update-athlete', () => ({ updateAthlete: vi.fn() }))
vi.mock('./actions/set-athlete-active', () => ({ setAthleteActive: vi.fn() }))
vi.mock('./actions/unlink-athlete', () => ({ unlinkAthlete: vi.fn() }))

// muestra el state recibido para verificar el aviso que se envía al listado
function AthletesStub() {
  const { state } = useLocation()
  return <p>listado de atletas {JSON.stringify(state)}</p>
}

const juana = createdAthlete({ goal: 'Hipertrofia' })

const renderPage = () => {
  const router = createMemoryRouter(
    [
      { path: paths.editAthlete, element: <EditAthletePage /> },
      { path: paths.athletes, element: <AthletesStub /> },
    ],
    { initialEntries: [athleteEditPath(juana.id)] },
  )
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
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(getAthlete).mockReset()
  vi.mocked(updateAthlete).mockReset()
  vi.mocked(setAthleteActive).mockReset()
  vi.mocked(unlinkAthlete).mockReset()
  saveSession(session('COACH'))
})

describe('EditAthletePage', () => {
  it('pide el atleta de la URL y precarga el formulario', async () => {
    vi.mocked(getAthlete).mockResolvedValue(juana)

    renderPage()

    expect(screen.getByRole('status', { name: 'Cargando atleta' }))
    expect(
      await screen.findByRole('heading', {
        name: 'Editar a Juana Pérez',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(getAthlete).toHaveBeenCalledWith(juana.id)
    expect(screen.getByLabelText('Objetivo')).toHaveValue('Hipertrofia')
    expect(screen.queryByLabelText(/Contraseña/)).not.toBeInTheDocument()
  })

  it.each([
    [404, 'Atleta no encontrado'],
    [403, 'No tenés acceso a este atleta'],
  ])('muestra el mensaje del backend ante un %i', async (status, message) => {
    vi.mocked(getAthlete).mockRejectedValue(new ApiError(message, status))

    renderPage()

    expect(
      await screen.findByText('No encontramos este atleta'),
    ).toBeInTheDocument()
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Reintentar/ }),
    ).not.toBeInTheDocument()
  })

  it('permite reintentar ante otros errores', async () => {
    vi.mocked(getAthlete)
      .mockRejectedValueOnce(new ApiError('No se pudo conectar', 0))
      .mockResolvedValueOnce(juana)

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar',
    )
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(
      await screen.findByRole('heading', { name: 'Editar a Juana Pérez' }),
    ).toBeInTheDocument()
  })

  it('cancelar vuelve al listado', async () => {
    vi.mocked(getAthlete).mockResolvedValue(juana)

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar' }),
    )
    expect(screen.getByText('listado de atletas null')).toBeInTheDocument()
  })

  it('guarda los cambios y vuelve al listado con el aviso', async () => {
    vi.mocked(getAthlete).mockResolvedValue(juana)
    vi.mocked(updateAthlete).mockResolvedValue({ ...juana, lastName: 'Gómez' })

    renderPage()

    const lastName = await screen.findByLabelText(/Apellido/)
    await userEvent.clear(lastName)
    await userEvent.type(lastName, 'Gómez')
    await userEvent.clear(screen.getByLabelText('Objetivo'))
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    )

    expect(
      await screen.findByText(
        'listado de atletas {"notice":"Guardaste los cambios de Juana Gómez."}',
      ),
    ).toBeInTheDocument()
    expect(updateAthlete).toHaveBeenCalledWith(
      juana.id,
      expect.objectContaining({ lastName: 'Gómez', goal: null }),
    )
  })

  it('muestra el mensaje del backend si el email ya existe', async () => {
    vi.mocked(getAthlete).mockResolvedValue(juana)
    vi.mocked(updateAthlete).mockRejectedValue(
      new ApiError('Ya existe un usuario registrado con ese email', 409),
    )

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Guardar cambios' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe un usuario registrado con ese email',
    )
  })

  it('desactiva la cuenta tras confirmar y muestra el nuevo estado', async () => {
    vi.mocked(getAthlete).mockResolvedValue(juana)
    vi.mocked(setAthleteActive).mockResolvedValue({ ...juana, active: false })

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Desactivar cuenta' }),
    )
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Desactivar',
      }),
    )

    expect(await screen.findByText('Desactivada')).toBeInTheDocument()
    expect(setAthleteActive).toHaveBeenCalledWith(juana.id, false)
    expect(
      screen.getByRole('button', { name: 'Reactivar cuenta' }),
    ).toBeEnabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reactiva la cuenta sin confirmar', async () => {
    vi.mocked(getAthlete).mockResolvedValue({ ...juana, active: false })
    vi.mocked(setAthleteActive).mockResolvedValue(juana)

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Reactivar cuenta' }),
    )

    expect(await screen.findByText('Activa')).toBeInTheDocument()
    expect(setAthleteActive).toHaveBeenCalledWith(juana.id, true)
  })

  it('desvincula tras confirmar y vuelve al listado con el aviso', async () => {
    vi.mocked(getAthlete).mockResolvedValue(juana)
    vi.mocked(unlinkAthlete).mockResolvedValue(undefined)

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /Desvincular/ }),
    )
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Desvincular',
      }),
    )

    expect(
      await screen.findByText(
        'listado de atletas {"notice":"Desvinculaste a Juana Pérez."}',
      ),
    ).toBeInTheDocument()
    expect(unlinkAthlete).toHaveBeenCalledWith(juana.id)
    // no vuelve a pedir el detalle: respondería 403
    expect(getAthlete).toHaveBeenCalledTimes(1)
  })

  it('muestra el error de una acción de la cuenta', async () => {
    vi.mocked(getAthlete).mockResolvedValue(juana)
    vi.mocked(unlinkAthlete).mockRejectedValue(
      new ApiError('No tenés acceso a este atleta', 403),
    )

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /Desvincular/ }),
    )
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Desvincular',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tenés acceso a este atleta',
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })
})
