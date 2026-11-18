import { expect, test, type Page, type Request } from '@playwright/test'
import { athleteProfilePath } from '../src/router/paths.ts'
import {
  apiError,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// US-30: el entrenador ve la evolución del peso y las fotos de un atleta de su cartera, desde la
// ficha y en solo lectura. Son los mismos endpoints que usa el atleta (US-28/US-29)
const ATHLETE_URL = /\/api\/athletes\/[^/?]+$/
const WEIGHTS_URL = /\/api\/athletes\/[^/]+\/weights(\?.*)?$/
const PHOTOS_URL = /\/api\/athletes\/[^/]+\/photos(\?.*)?$/
const PHOTO_URL = /\/api\/athletes\/[^/]+\/photos\/[^/?]+$/
const STORAGE_URL = /https:\/\/storage\.example\.test\/.*/
// el resto de la ficha no es parte de estas pruebas: responde vacío
const ASSIGNMENTS_URL = /\/api\/athletes\/[^/]+\/assignments(\?.*)?$/
const SESSIONS_URL = /\/api\/athletes\/[^/]+\/sessions(\?.*)?$/
const MEALS_OVERVIEW_URL = /\/api\/athletes\/[^/]+\/meals\/overview(\?.*)?$/

const NOW = new Date('2026-11-07T02:30:00Z')
const FUTURE = '2099-01-01T00:00:00Z'
const PAST = '2000-01-01T00:00:00Z'

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const leoJson = () => ({
  id: '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c',
  coachId: coach.id,
  firstName: 'Leo',
  lastName: 'Gil',
  email: 'leo@test.com',
  phone: null,
  status: 'ACTIVE',
  active: true,
  sex: null,
  experienceLevel: null,
  birthDate: null,
  heightCm: null,
  initialWeightKg: 80,
  goal: null,
  injuries: null,
  limitations: null,
  availableDays: null,
  startDate: null,
  createdAt: '2026-10-31T20:05:12.345678Z',
})

const LEO_ID = leoJson().id

const weightJson = (n: number, date: string, weightKg: number) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  date,
  weightKg,
  comment: null,
  createdAt: `${date}T11:20:31Z`,
  updatedAt: `${date}T11:20:31Z`,
})

const photoJson = (
  n: number,
  type: string,
  takenOn: string,
  urlExpiresAt: string,
) => ({
  id: `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  type,
  takenOn,
  url: `https://storage.example.test/fotos/${n}.png?token=viejo`,
  urlExpiresAt,
  createdAt: `${takenOn}T12:00:00Z`,
})

const page0 = <T>(content: T[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
})

type WeightJson = ReturnType<typeof weightJson>
type PhotoJson = ReturnType<typeof photoJson>

// imita al backend para un atleta de la cartera: pesos por fecha descendente con from/to, fotos de
// la más antigua a la más nueva y el detalle de una foto con su URL firmada renovada
const routeAthlete = async (
  page: Page,
  { weights, photos }: { weights: WeightJson[]; photos: PhotoJson[] },
) => {
  const weightRequests: Request[] = []
  const photoDetails: Request[] = []
  await page.route(ATHLETE_URL, (route) =>
    route.fulfill({ status: 200, json: leoJson() }),
  )
  await page.route(WEIGHTS_URL, (route) => {
    weightRequests.push(route.request())
    const params = new URL(route.request().url()).searchParams
    const from = params.get('from')
    const to = params.get('to')
    const size = Number(params.get('size') ?? 20)
    const matching = weights
      .filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
      .sort((a, b) => b.date.localeCompare(a.date))
    return route.fulfill({
      status: 200,
      json: {
        content: matching.slice(0, size),
        page: 0,
        size,
        totalElements: matching.length,
        totalPages: Math.ceil(matching.length / size),
      },
    })
  })
  await page.route(PHOTOS_URL, (route) =>
    route.fulfill({ status: 200, json: page0(photos) }),
  )
  await page.route(PHOTO_URL, (route) => {
    photoDetails.push(route.request())
    const id = route.request().url().split('/').at(-1)!
    return route.fulfill({
      status: 200,
      json: {
        ...photos.find((p) => p.id === id),
        url: `https://storage.example.test/fotos/${id}.png?token=nuevo`,
        urlExpiresAt: FUTURE,
      },
    })
  })
  await page.route(STORAGE_URL, (route) =>
    route.fulfill({ status: 200, body: PNG_1X1, contentType: 'image/png' }),
  )
  return { weightRequests, photoDetails }
}

const progress = (page: Page) => page.getByRole('region', { name: 'Progreso' })

test.describe('como entrenador · progreso del atleta', () => {
  test.use({ timezoneId: 'UTC' })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
    for (const url of [ASSIGNMENTS_URL, SESSIONS_URL]) {
      await page.route(url, (route) =>
        route.fulfill({ status: 200, json: page0([]) }),
      )
    }
    await page.route(MEALS_OVERVIEW_URL, (route) => {
      const params = new URL(route.request().url()).searchParams
      return route.fulfill({
        status: 200,
        json: {
          from: params.get('from'),
          to: params.get('to'),
          totalDays: 7,
          daysWithMeals: 0,
          days: [],
        },
      })
    })
  })

  test('ve el mismo gráfico y la misma galería que el atleta, sin poder modificarlos', async ({
    page,
  }) => {
    const older = photoJson(1, 'FRONT', '2026-10-01', FUTURE)
    const newer = photoJson(2, 'SIDE', '2026-10-15', PAST)
    const { weightRequests, photoDetails } = await routeAthlete(page, {
      weights: [
        weightJson(1, '2026-10-01', 75),
        weightJson(2, '2026-10-20', 74.2),
        weightJson(3, '2026-11-06', 72.5),
      ],
      photos: [older, newer],
    })

    await page.goto(athleteProfilePath(LEO_ID))

    const section = progress(page)
    await expect(
      section.getByRole('img', { name: 'Evolución del peso' }),
    ).toBeVisible()
    await expect(section.locator('details table tbody tr')).toHaveCount(3)
    // pide los pesos del atleta de la URL, no los del usuario de la sesión
    expect(
      weightRequests.every((r) =>
        new URL(r.url()).pathname.startsWith(`/api/athletes/${LEO_ID}/`),
      ),
    ).toBe(true)

    const items = section
      .getByRole('list', { name: 'Fotos de progreso' })
      .getByRole('listitem')
    await expect(items).toHaveCount(2)
    await expect(items.first()).toContainText('1 de octubre de 2026')
    // la URL vencida se renueva con GET /photos/{photoId}
    await expect(
      section
        .getByRole('button', {
          name: 'Ver la foto Lateral del 15 de octubre de 2026',
        })
        .locator('img'),
    ).toHaveAttribute('src', /token=nuevo/)
    expect(photoDetails).toHaveLength(1)
    expect(new URL(photoDetails[0].url()).pathname).toBe(
      `/api/athletes/${LEO_ID}/photos/${newer.id}`,
    )

    // solo lectura: ni formulario de peso, ni subida, ni borrado
    await expect(
      page.getByRole('button', { name: 'Registrar peso' }),
    ).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Subir foto' })).toHaveCount(
      0,
    )
    await section
      .getByRole('button', {
        name: 'Ver la foto Frontal del 1 de octubre de 2026',
      })
      .click()
    const viewer = page.getByRole('dialog', {
      name: 'Frontal, 1 de octubre de 2026',
    })
    await expect(viewer).toBeVisible()
    await expect(
      viewer.getByRole('button', { name: 'Borrar foto' }),
    ).toHaveCount(0)
  })

  test('el rango del gráfico queda en la URL de la ficha', async ({ page }) => {
    await routeAthlete(page, {
      weights: [
        weightJson(1, '2026-10-01', 75),
        weightJson(2, '2026-10-20', 74.2),
        weightJson(3, '2026-11-06', 72.5),
      ],
      photos: [],
    })
    await page.goto(athleteProfilePath(LEO_ID))
    const section = progress(page)
    await expect(section.locator('details table tbody tr')).toHaveCount(3)

    await section.locator('label', { hasText: '30 días' }).click()

    await expect(page).toHaveURL(
      `${athleteProfilePath(LEO_ID)}?from=2026-10-07&to=2026-11-06`,
    )
    await expect(section.locator('details table tbody tr')).toHaveCount(2)
  })

  test('sin pesos ni fotos muestra los estados vacíos, sin ofrecer cargar', async ({
    page,
  }) => {
    await routeAthlete(page, { weights: [], photos: [] })

    await page.goto(athleteProfilePath(LEO_ID))

    const section = progress(page)
    await expect(
      section.getByText('El atleta todavía no registró su peso'),
    ).toBeVisible()
    await expect(
      section.getByRole('heading', {
        name: 'El atleta todavía no subió fotos de progreso',
      }),
    ).toBeVisible()
    await expect(
      section.getByRole('button', { name: 'Cargar mi peso' }),
    ).toHaveCount(0)
    await expect(
      section.getByRole('button', { name: 'Subir mi primera foto' }),
    ).toHaveCount(0)
  })

  test('un atleta de otro entrenador no muestra su progreso (403)', async ({
    page,
  }) => {
    const progressRequests: Request[] = []
    await page.route(ATHLETE_URL, (route) =>
      route.fulfill(
        apiError(
          403,
          'No tiene permisos para acceder a este atleta',
          `/athletes/${LEO_ID}`,
        ),
      ),
    )
    await page.route(WEIGHTS_URL, (route) =>
      route.fulfill(
        apiError(
          403,
          'No tiene permisos para acceder a este atleta',
          `/athletes/${LEO_ID}/weights`,
        ),
      ),
    )
    await page.route(PHOTOS_URL, (route) => {
      progressRequests.push(route.request())
      return route.fulfill({ status: 200, json: page0([]) })
    })

    await page.goto(athleteProfilePath(LEO_ID))

    await expect(
      page.getByRole('heading', { name: 'Este atleta no está en tu cartera' }),
    ).toBeVisible()
    await expect(progress(page)).toHaveCount(0)
    expect(progressRequests).toHaveLength(0)
  })

  test('un atleta que no existe no muestra su progreso (404)', async ({
    page,
  }) => {
    await page.route(ATHLETE_URL, (route) =>
      route.fulfill(
        apiError(404, 'No existe el atleta', `/athletes/${LEO_ID}`),
      ),
    )
    await page.route(WEIGHTS_URL, (route) =>
      route.fulfill(
        apiError(404, 'No existe el atleta', `/athletes/${LEO_ID}/weights`),
      ),
    )

    await page.goto(athleteProfilePath(LEO_ID))

    await expect(
      page.getByRole('heading', { name: 'El atleta no existe' }),
    ).toBeVisible()
    await expect(progress(page)).toHaveCount(0)
  })
})
