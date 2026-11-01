import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import type { Athlete } from '../../lib/athletes'
import { getAthlete } from '../../lib/athletes/get-athlete'
import { saveSession } from '../../lib/auth'
import { athleteProfilePath, paths } from '../../router/paths'
import { createdAthlete } from '../../test/athlete-fixtures'
import { session } from '../../test/auth-fixtures'
import { AthleteProfilePage } from './AthleteProfilePage'

vi.mock('../../lib/athletes/get-athlete', () => ({ getAthlete: vi.fn() }))

// ficha con todos los datos cargados (ejemplo del contrato de API)
const leo = createdAthlete({
  id: '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c',
  firstName: 'Leo',
  lastName: 'Gil',
  email: 'leo@test.com',
  phone: '1155667788',
  sex: 'MALE',
  experienceLevel: 'INTERMEDIATE',
  birthDate: '2000-05-20',
  heightCm: 178.5,
  initialWeightKg: 80.25,
  goal: 'Hipertrofia',
  injuries: 'Esguince de tobillo (2024)',
  limitations: 'Entrena en casa\nSin barra olímpica',
  availableDays: 4,
  startDate: '2026-11-01',
})

const renderPage = (athleteId = leo.id) => {
  const router = createMemoryRouter(
    [
      { path: paths.athleteProfile, element: <AthleteProfilePage /> },
      { path: paths.athletes, element: <p>listado de atletas</p> },
      { path: paths.editAthlete, element: <p>edición del atleta</p> },
    ],
    { initialEntries: [athleteProfilePath(athleteId)] },
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

const renderProfile = async (athlete: Athlete) => {
  vi.mocked(getAthlete).mockResolvedValue(athlete)
  renderPage(athlete.id)
  await screen.findByRole('heading', { level: 1 })
}

const section = (name: string) => screen.getByRole('region', { name })

// valor (dd) que acompaña a una etiqueta (dt) dentro de una sección
const valueOf = (sectionName: string, label: string) =>
  within(section(sectionName)).getByText(label, { selector: 'dt' })
    .nextElementSibling

beforeEach(() => {
  vi.mocked(getAthlete).mockReset()
  saveSession(session('COACH'))
  // la edad depende de hoy: solo se fija la fecha, los timers siguen siendo reales
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 31, 12))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AthleteProfilePage', () => {
  it('muestra un skeleton mientras carga y después la ficha del atleta de la URL', async () => {
    vi.mocked(getAthlete).mockResolvedValue(leo)

    renderPage()

    expect(
      screen.getByRole('status', { name: 'Cargando ficha del atleta' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Leo Gil', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: 'Cargando ficha del atleta' }),
    ).not.toBeInTheDocument()
    expect(getAthlete).toHaveBeenCalledWith(leo.id)
  })

  it('el encabezado muestra estado, objetivo e inicio', async () => {
    await renderProfile(leo)

    const header = screen.getByRole('heading', { level: 1 }).closest('section')
    expect(header).toHaveTextContent('Activo')
    expect(header).toHaveTextContent('Objetivo: Hipertrofia')
    expect(header).toHaveTextContent('Inicio: 1 de noviembre de 2026')
    expect(header).not.toHaveTextContent('Cuenta desactivada')
  })

  it('muestra los datos personales con la edad calculada (CA-1)', async () => {
    await renderProfile(leo)

    const name = 'Datos personales'
    expect(valueOf(name, 'Nombre')).toHaveTextContent('Leo Gil')
    expect(valueOf(name, 'Email')).toHaveTextContent('leo@test.com')
    expect(valueOf(name, 'Teléfono')).toHaveTextContent('1155667788')
    expect(valueOf(name, 'Sexo')).toHaveTextContent('Masculino')
    expect(valueOf(name, 'Fecha de nacimiento')).toHaveTextContent(
      '20 de mayo de 2000 (26 años)',
    )
    expect(
      within(section(name)).getByText('20 de mayo de 2000'),
    ).toHaveAttribute('datetime', '2000-05-20')
    expect(valueOf(name, 'Fecha de inicio')).toHaveTextContent(
      '1 de noviembre de 2026',
    )
    expect(valueOf(name, 'Estado')).toHaveTextContent('Activo')
    expect(valueOf(name, 'Cuenta')).toHaveTextContent('Activa')
  })

  it('muestra los datos de salud y entrenamiento (CA-2)', async () => {
    await renderProfile(leo)

    const name = 'Salud y entrenamiento'
    expect(valueOf(name, 'Objetivo')).toHaveTextContent('Hipertrofia')
    expect(valueOf(name, 'Nivel de experiencia')).toHaveTextContent(
      'Intermedio',
    )
    expect(valueOf(name, 'Altura')).toHaveTextContent('178,5 cm')
    expect(valueOf(name, 'Días disponibles')).toHaveTextContent(
      '4 días por semana',
    )
    expect(valueOf(name, 'Lesiones')).toHaveTextContent(
      'Esguince de tobillo (2024)',
    )
    expect(valueOf(name, 'Limitaciones')).toHaveTextContent(
      'Entrena en casa Sin barra olímpica',
    )
  })

  it('el último peso es el peso inicial, rotulado como tal, y rutina y sesiones están vacías (CA-3)', async () => {
    await renderProfile(leo)

    expect(valueOf('Último peso', 'Peso inicial')).toHaveTextContent('80,25 kg')
    expect(
      within(section('Rutina activa')).getByRole('heading', {
        name: 'Sin rutina asignada',
      }),
    ).toBeInTheDocument()
    expect(
      within(section('Últimas sesiones')).getByRole('heading', {
        name: 'Todavía no registró entrenamientos',
      }),
    ).toBeInTheDocument()
  })

  it('los opcionales en null, vacíos o con espacios se muestran como "Sin cargar" (CA-4)', async () => {
    await renderProfile(
      createdAthlete({
        phone: '   ',
        goal: '',
        injuries: ' \n ',
        limitations: null,
        experienceLevel: 'BEGINNER',
        availableDays: 1,
      }),
    )

    for (const label of [
      'Teléfono',
      'Sexo',
      'Fecha de nacimiento',
      'Fecha de inicio',
    ]) {
      expect(valueOf('Datos personales', label)).toHaveTextContent('Sin cargar')
    }
    for (const label of ['Objetivo', 'Altura', 'Lesiones', 'Limitaciones']) {
      expect(valueOf('Salud y entrenamiento', label)).toHaveTextContent(
        'Sin cargar',
      )
    }
    expect(
      valueOf('Salud y entrenamiento', 'Días disponibles'),
    ).toHaveTextContent('1 día por semana')
    // sin objetivo ni inicio, el encabezado no muestra esos datos
    const header = screen.getByRole('heading', { level: 1 }).closest('section')
    expect(header).not.toHaveTextContent('Objetivo')
    expect(header).not.toHaveTextContent('Inicio')
    expect(document.body).not.toHaveTextContent(/null|undefined|NaN/)
  })

  it('sin datos de salud ni peso muestra estados vacíos con un link para cargarlos (CA-4)', async () => {
    const empty = createdAthlete({ goal: ' ', injuries: '', limitations: '  ' })
    await renderProfile(empty)

    const health = section('Salud y entrenamiento')
    expect(
      within(health).getByRole('heading', {
        name: 'Sin datos de salud y entrenamiento',
      }),
    ).toBeInTheDocument()
    expect(within(health).queryByRole('term')).not.toBeInTheDocument()
    expect(
      within(health).getByRole('link', { name: 'Completar datos' }),
    ).toHaveAttribute('href', `/athletes/${empty.id}/edit`)

    const weight = section('Último peso')
    expect(
      within(weight).getByRole('heading', { name: 'Sin registros de peso' }),
    ).toBeInTheDocument()
    expect(
      within(weight).getByRole('link', { name: 'Cargar peso inicial' }),
    ).toHaveAttribute('href', `/athletes/${empty.id}/edit`)
  })

  it('muestra la cuenta desactivada aparte del estado de seguimiento', async () => {
    await renderProfile({ ...leo, status: 'ACTIVE', active: false })

    const header = screen.getByRole('heading', { level: 1 }).closest('section')
    expect(header).toHaveTextContent('Activo')
    expect(header).toHaveTextContent('Cuenta desactivada')
    expect(valueOf('Datos personales', 'Estado')).toHaveTextContent('Activo')
    expect(valueOf('Datos personales', 'Cuenta')).toHaveTextContent(
      'Desactivada',
    )
  })

  it('muestra el estado que requiere revisión', async () => {
    await renderProfile({ ...leo, status: 'NEEDS_REVIEW' })

    expect(valueOf('Datos personales', 'Estado')).toHaveTextContent(
      'Requiere revisión',
    )
  })

  it('Editar datos lleva a la edición del atleta', async () => {
    await renderProfile(leo)

    await userEvent.click(screen.getByRole('button', { name: 'Editar datos' }))

    expect(screen.getByText('edición del atleta')).toBeInTheDocument()
  })

  it('tiene un link de vuelta al listado', async () => {
    await renderProfile(leo)

    await userEvent.click(
      screen.getByRole('link', { name: 'Volver a atletas' }),
    )

    expect(screen.getByText('listado de atletas')).toBeInTheDocument()
  })

  it.each([
    [404, 'No existe el atleta con id 3f1c2a9e'],
    [400, 'Failed to convert value of type String to UUID'],
  ])(
    'ante un %i muestra que el atleta no existe y la salida al listado (CE-1)',
    async (status, message) => {
      vi.mocked(getAthlete).mockRejectedValue(new ApiError(message, status))

      renderPage()

      expect(
        await screen.findByRole('heading', { name: 'El atleta no existe' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'Volver a atletas' }),
      ).toHaveAttribute('href', paths.athletes)
      expect(screen.queryByText(message)).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /Reintentar/ }),
      ).not.toBeInTheDocument()
    },
  )

  it('ante un 403 avisa que no está en la cartera, sea desvinculado o de otro entrenador (CE-2, CE-3)', async () => {
    vi.mocked(getAthlete).mockRejectedValue(
      new ApiError('No tiene permisos para acceder a este atleta', 403),
    )

    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'Este atleta no está en tu cartera',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Puede que lo hayas desvinculado o que pertenezca a otro entrenador.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Volver a atletas' }),
    ).toHaveAttribute('href', paths.athletes)
    expect(
      screen.queryByRole('button', { name: /Reintentar/ }),
    ).not.toBeInTheDocument()
  })

  it('ante un error del servidor o de red muestra el mensaje y permite reintentar (CE-4)', async () => {
    vi.mocked(getAthlete)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValueOnce(leo)

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    expect(
      screen.getByRole('link', { name: 'Volver a atletas' }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(
      await screen.findByRole('heading', { name: 'Leo Gil', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('un error que no viene de la API muestra un mensaje genérico', async () => {
    vi.mocked(getAthlete).mockRejectedValue(new TypeError('boom'))

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado. Intentá nuevamente.',
    )
  })
})
