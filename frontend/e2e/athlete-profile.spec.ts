import { expect, test, type Page, type Request } from '@playwright/test'
import {
  athleteEditPath,
  athleteProfilePath,
  paths,
} from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

const ATHLETES_URL = /\/api\/athletes(\?.*)?$/
const ATHLETE_URL = /\/api\/athletes\/[^/?]+$/
// último peso de la ficha (US-26): GET /athletes/{id}/weights?size=1
const WEIGHTS_URL = /\/api\/athletes\/[^/]+\/weights(\?.*)?$/

// ejemplo de AthleteResponse del contrato de API, de la cartera del entrenador
const leoJson = () => ({
  id: '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c',
  coachId: coach.id,
  firstName: 'Leo',
  lastName: 'Gil',
  email: 'leo@test.com',
  phone: '1155667788' as string | null,
  status: 'ACTIVE',
  active: true,
  sex: 'MALE' as string | null,
  experienceLevel: 'INTERMEDIATE' as string | null,
  birthDate: '2000-05-20' as string | null,
  heightCm: 178.5 as number | null,
  initialWeightKg: 80.25 as number | null,
  goal: 'Hipertrofia' as string | null,
  injuries: 'Esguince de tobillo (2024)' as string | null,
  limitations: null as string | null,
  availableDays: 4 as number | null,
  startDate: '2026-11-01' as string | null,
  createdAt: '2026-10-31T20:05:12.345678Z',
})

type AthleteJson = ReturnType<typeof leoJson>

// el backend no normaliza los textos opcionales: pueden llegar vacíos o con espacios
const withoutOptionals = (): AthleteJson => ({
  ...leoJson(),
  phone: '',
  sex: null,
  experienceLevel: null,
  birthDate: null,
  heightCm: null,
  initialWeightKg: null,
  goal: '   ',
  injuries: '',
  limitations: null,
  availableDays: null,
  startDate: null,
})

// registro de peso del contrato de API (8.2)
const weightJson = () => ({
  id: '6d0f8e2a-1b3c-4d5e-8f9a-0b1c2d3e4f5a',
  date: '2026-11-06',
  weightKg: 72.5,
  comment: 'En ayunas' as string | null,
  createdAt: '2026-11-06T11:20:31.123456Z',
  updatedAt: '2026-11-06T11:20:31.123456Z',
})

type WeightJson = ReturnType<typeof weightJson>
type ErrorJson = { status: number; message: string }

// GET /athletes (listado), GET /athletes/{id} y GET /athletes/{id}/weights: responde el atleta
// dado o el error indicado. Los pesos fallan igual que el atleta (mismo AthleteAccessGuard);
// si no, responden los registros dados (por defecto, ninguno) o su propio error
const routeBackend = async (
  page: Page,
  detail: AthleteJson | ErrorJson,
  weights: WeightJson[] | ErrorJson = [],
) => {
  const requests: Request[] = []
  const weightRequests: Request[] = []
  await page.route(WEIGHTS_URL, (route) => {
    weightRequests.push(route.request())
    const path = new URL(route.request().url()).pathname.replace('/api', '')
    const failure = 'id' in detail ? weights : detail
    if (!Array.isArray(failure) && 'status' in failure) {
      return route.fulfill(apiError(failure.status, failure.message, path))
    }
    const content = Array.isArray(weights) ? weights : []
    return route.fulfill({
      status: 200,
      json: {
        content,
        page: 0,
        size: 1,
        totalElements: content.length,
        totalPages: content.length ? 1 : 0,
      },
    })
  })
  await page.route(ATHLETES_URL, (route) => {
    const content = 'id' in detail ? [detail] : []
    return route.fulfill({
      status: 200,
      json: {
        content,
        page: 0,
        size: 20,
        totalElements: content.length,
        totalPages: content.length ? 1 : 0,
      },
    })
  })
  await page.route(ATHLETE_URL, (route) => {
    requests.push(route.request())
    const path = new URL(route.request().url()).pathname.replace('/api', '')
    return 'id' in detail
      ? route.fulfill({ status: 200, json: detail })
      : route.fulfill(apiError(detail.status, detail.message, path))
  })
  return Object.assign(requests, { weights: weightRequests })
}

const section = (page: Page, name: string) => page.getByRole('region', { name })

test.describe('como entrenador', () => {
  test.beforeEach(async ({ page }) => {
    // la edad depende de hoy: se fija la fecha y los timers siguen andando
    await page.clock.setFixedTime(new Date('2026-10-31T12:00:00'))
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('abre la ficha desde la card y ve todos sus datos', async ({ page }) => {
    const leo = leoJson()
    const requests = await routeBackend(page, leo)
    await page.goto(paths.athletes)

    await page
      .getByRole('region', { name: 'Leo Gil' })
      .getByRole('link', { name: 'Ver ficha de Leo Gil' })
      .click()

    await expect(page).toHaveURL(athleteProfilePath(leo.id))
    await expect(
      page.getByRole('navigation', { name: 'Ubicación' }),
    ).toContainText('Perfil del atleta')
    await expect(
      page.getByRole('heading', { name: 'Leo Gil', level: 1 }),
    ).toBeVisible()

    const personal = section(page, 'Datos personales')
    await expect(personal).toContainText('leo@test.com')
    await expect(personal).toContainText('1155667788')
    await expect(personal).toContainText('Masculino')
    await expect(personal).toContainText('20 de mayo de 2000 (26 años)')
    await expect(personal).toContainText('1 de noviembre de 2026')
    await expect(personal).toContainText('Activo')
    await expect(personal).toContainText('Activa')

    const health = section(page, 'Salud y entrenamiento')
    await expect(health).toContainText('Hipertrofia')
    await expect(health).toContainText('Intermedio')
    await expect(health).toContainText('178,5 cm')
    await expect(health).toContainText('4 días por semana')
    await expect(health).toContainText('Esguince de tobillo (2024)')

    await expect(section(page, 'Último peso')).toContainText('Peso inicial')
    await expect(section(page, 'Último peso')).toContainText('80,25 kg')
    await expect(section(page, 'Rutina activa')).toContainText(
      'Sin rutina asignada',
    )
    await expect(section(page, 'Últimas sesiones')).toContainText(
      'Todavía no registró entrenamientos',
    )

    expect(requests[0].headers().authorization).toBe('Bearer access-1')
    // sin registros de peso se muestra el inicial; igual se consultó el último registro
    expect(
      Object.fromEntries(new URL(requests.weights[0].url()).searchParams),
    ).toEqual({ size: '1' })
  })

  test('ve el último peso registrado con su fecha y comentario', async ({
    page,
  }) => {
    const leo = leoJson()
    const requests = await routeBackend(page, leo, [weightJson()])

    await page.goto(athleteProfilePath(leo.id))

    const weight = section(page, 'Último peso')
    await expect(weight).toContainText('Último registro')
    await expect(weight).toContainText('72,5 kg')
    await expect(weight).toContainText('Registrado el 6 de noviembre de 2026.')
    await expect(weight).toContainText('En ayunas')
    await expect(weight).not.toContainText('Peso inicial')
    expect(new URL(requests.weights[0].url()).pathname).toBe(
      `/api/athletes/${leo.id}/weights`,
    )
  })

  test('si falla solo el último peso, el resto de la ficha se ve', async ({
    page,
  }) => {
    const leo = leoJson()
    await routeBackend(page, leo, {
      status: 500,
      message: 'Ocurrió un error inesperado. Intente nuevamente más tarde',
    })

    await page.goto(athleteProfilePath(leo.id))

    const weight = section(page, 'Último peso')
    await expect(weight.getByRole('alert')).toContainText(
      'No se pudo cargar el último peso.',
    )
    await expect(
      weight.getByRole('button', { name: 'Reintentar' }),
    ).toBeVisible()
    await expect(section(page, 'Datos personales')).toContainText(
      'leo@test.com',
    )
  })

  test('desde la ficha va a editar al atleta y vuelve al listado', async ({
    page,
  }) => {
    const leo = leoJson()
    await routeBackend(page, leo)
    await page.goto(athleteProfilePath(leo.id))

    await page.getByRole('button', { name: 'Editar datos' }).click()
    await expect(page).toHaveURL(athleteEditPath(leo.id))
    await expect(
      page.getByRole('heading', { name: 'Editar a Leo Gil', level: 1 }),
    ).toBeVisible()

    // la edición también tiene "Volver a atletas": esperar a estar de nuevo en la ficha
    await page.goBack()
    await expect(page).toHaveURL(athleteProfilePath(leo.id))
    await expect(
      page.getByRole('heading', { name: 'Leo Gil', level: 1 }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Volver a atletas' }).click()
    await expect(page).toHaveURL(paths.athletes)
  })

  test('los datos que faltan se muestran como sin cargar o con su estado vacío', async ({
    page,
  }) => {
    const athleteWithoutData = withoutOptionals()
    await routeBackend(page, athleteWithoutData)

    await page.goto(athleteProfilePath(athleteWithoutData.id))

    const personal = section(page, 'Datos personales')
    await expect(personal).toContainText('leo@test.com')
    // teléfono, sexo, nacimiento e inicio
    await expect(personal.getByText('Sin cargar')).toHaveCount(4)
    await expect(
      section(page, 'Salud y entrenamiento').getByRole('heading', {
        name: 'Sin datos de salud y entrenamiento',
      }),
    ).toBeVisible()
    await expect(
      section(page, 'Último peso').getByRole('heading', {
        name: 'Sin registros de peso',
      }),
    ).toBeVisible()
    await expect(page.getByRole('main')).not.toContainText(/null|undefined|NaN/)
  })

  test('un atleta que no está en su cartera muestra el aviso (403)', async ({
    page,
  }) => {
    await routeBackend(page, {
      status: 403,
      message: 'No tiene permisos para acceder a este atleta',
    })

    await page.goto(athleteProfilePath(leoJson().id))

    await expect(
      page.getByRole('heading', { name: 'Este atleta no está en tu cartera' }),
    ).toBeVisible()
    await expect(page.getByRole('main')).toContainText(
      'Puede que lo hayas desvinculado o que pertenezca a otro entrenador.',
    )
    await page.getByRole('link', { name: 'Volver a atletas' }).click()
    await expect(page).toHaveURL(paths.athletes)
  })

  test('un atleta inexistente avisa que no existe (404)', async ({ page }) => {
    await routeBackend(page, {
      status: 404,
      message: `No existe el atleta con id ${leoJson().id}`,
    })

    await page.goto(athleteProfilePath(leoJson().id))

    await expect(
      page.getByRole('heading', { name: 'El atleta no existe' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Volver a atletas' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeHidden()
  })

  test('/athletes/new sigue abriendo el alta y no la ficha', async ({
    page,
  }) => {
    const requests = await routeBackend(page, leoJson())

    await page.goto(paths.newAthlete)

    await expect(
      page.getByRole('heading', { name: 'Agregar nuevo atleta', level: 1 }),
    ).toBeVisible()
    expect(requests).toHaveLength(0)
  })
})

test('un atleta no puede entrar a la ficha de un atleta', async ({ page }) => {
  await seedSession(page, athlete, 'access-1')
  await routeCurrentUser(page, athlete)

  await page.goto(athleteProfilePath(leoJson().id))

  await expect(page).toHaveURL(paths.dashboard)
})
