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

// GET /athletes (listado) y GET /athletes/{id}: responde el atleta dado o el error indicado
const routeBackend = async (
  page: Page,
  detail: AthleteJson | { status: number; message: string },
) => {
  const requests: Request[] = []
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
  return requests
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
