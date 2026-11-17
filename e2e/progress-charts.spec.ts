import { expect, test, type Page, type Request } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// US-29: gráfico de evolución del peso (rango en la URL) y galería de fotos con URLs renovadas
const WEIGHTS_URL = /\/api\/athletes\/[^/]+\/weights(\?.*)?$/
const PHOTOS_URL = /\/api\/athletes\/[^/]+\/photos(\?.*)?$/
const PHOTO_URL = /\/api\/athletes\/[^/]+\/photos\/[^/?]+$/
const STORAGE_URL = /https:\/\/storage\.example\.test\/.*/

// 23:30 del 6/11 en Argentina: el "hoy" de la app es el 6 (contrato, 8.8)
const NOW = new Date('2026-11-07T02:30:00Z')
const TODAY = '2026-11-06'
const FUTURE = '2099-01-01T00:00:00Z'
const PAST = '2000-01-01T00:00:00Z'

// PNG de 1 píxel: basta para que el <img> cargue
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

type WeightJson = {
  id: string
  date: string
  weightKg: number
  comment: string | null
  createdAt: string
  updatedAt: string
}

const weightJson = (n: number, overrides: Partial<WeightJson>): WeightJson => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  date: TODAY,
  weightKg: 72.5,
  comment: null,
  createdAt: '2026-11-06T11:20:31Z',
  updatedAt: '2026-11-06T11:20:31Z',
  ...overrides,
})

const oct1 = () => weightJson(1, { date: '2026-10-01', weightKg: 75 })
const oct20 = () => weightJson(2, { date: '2026-10-20', weightKg: 74.2 })
const today = () => weightJson(3, { date: TODAY, weightKg: 72.5 })

// imita al backend de US-26 y US-29 en memoria: listado paginado por fecha descendente, filtro
// por from/to inclusivos, alta con un registro por día (409). `badRangeFrom` simula un 400
const routeWeights = async (
  page: Page,
  initial: WeightJson[],
  options: { badRangeFrom?: string } = {},
) => {
  let records = initial
  let nextId = 100
  const requests: Request[] = []
  const pathOf = (request: Request) =>
    new URL(request.url()).pathname.replace('/api', '')

  await page.route(WEIGHTS_URL, (route) => {
    const request = route.request()
    requests.push(request)
    const path = pathOf(request)
    if (!path.startsWith(`/athletes/${athlete.id}/`)) {
      return route.fulfill(
        apiError(403, 'No tiene permisos para acceder a este atleta', path),
      )
    }

    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Omit<WeightJson, 'id'>
      if (records.some((r) => r.date === body.date)) {
        return route.fulfill({
          status: 409,
          json: {
            ...apiError(
              409,
              'Ya existe un registro de peso para el 06/11/2026',
              path,
            ).json,
            error: 'Conflict',
          },
        })
      }
      const created = weightJson(nextId++, body)
      records = [...records, created]
      return route.fulfill({ status: 201, json: created })
    }

    const params = new URL(request.url()).searchParams
    const from = params.get('from')
    const to = params.get('to')
    if (options.badRangeFrom && from === options.badRangeFrom) {
      return route.fulfill(
        apiError(400, 'La solicitud tiene campos inválidos', path),
      )
    }
    const pageNumber = Number(params.get('page') ?? 0)
    const size = Number(params.get('size') ?? 20)
    const matching = records
      .filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
      .sort((a, b) => b.date.localeCompare(a.date))
    return route.fulfill({
      status: 200,
      json: {
        content: matching.slice(pageNumber * size, (pageNumber + 1) * size),
        page: pageNumber,
        size,
        totalElements: matching.length,
        totalPages: Math.ceil(matching.length / size),
      },
    })
  })

  return requests
}

const paramsOf = (request: Request) =>
  Object.fromEntries(new URL(request.url()).searchParams)

const chart = (page: Page) =>
  page.getByRole('img', { name: 'Evolución del peso' })

// la tabla de datos vive en un <details> cerrado: el rol no la ve hasta abrirlo, así que se cuenta
// por CSS (el contenido sigue en el DOM y el texto se verifica igual)
const chartRows = (page: Page) => page.locator('details table tbody tr')

const weightField = (page: Page) =>
  page.getByRole('spinbutton', { name: /Peso/ })

// la página de progreso: el gráfico vive debajo del formulario, a la derecha en escritorio
const openProgress = async (page: Page, search = '') => {
  await page.goto(`${paths.progress}${search}`)
  await expect(
    page.getByRole('heading', { name: 'Progreso', level: 1 }),
  ).toBeVisible()
}

test.describe('como atleta · evolución del peso', () => {
  test.use({ timezoneId: 'UTC' })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
    // las fotos no son parte de estas pruebas: la sección arranca vacía
    await page.route(PHOTOS_URL, (route) =>
      route.fulfill({
        status: 200,
        json: {
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
        },
      }),
    )
  })

  test('dibuja la evolución de todo el historial, de la más antigua a la más nueva', async ({
    page,
  }) => {
    const requests = await routeWeights(page, [today(), oct1(), oct20()])

    await openProgress(page)

    await expect(chart(page)).toBeVisible()
    await expect(chart(page)).toHaveAccessibleDescription(
      /^3 registros, del 1 de octubre de 2026 al 6 de noviembre de 2026/,
    )
    await expect(chartRows(page)).toHaveCount(3)
    await expect(chartRows(page).first()).toContainText('1 de octubre de 2026')
    await expect(chartRows(page).last()).toContainText('72,5 kg')
    await expect(page.getByRole('radio', { name: 'Todo' })).toBeChecked()

    // sin rango no se mandan fechas, y se pide de a 100 (contrato, 8.6)
    const evolution = requests.find((r) => paramsOf(r).size === '100')!
    expect(paramsOf(evolution)).toEqual({ page: '0', size: '100' })
  })

  test('un atajo pone el rango en la URL y pide solo esas fechas', async ({
    page,
  }) => {
    const requests = await routeWeights(page, [today(), oct1(), oct20()])
    await openProgress(page)
    await expect(chartRows(page)).toHaveCount(3)

    // se toca el texto del atajo, como un usuario (el radio está oculto dentro de su etiqueta)
    await page.locator('label', { hasText: '30 días' }).click()

    await expect(page).toHaveURL(/\?from=2026-10-07&to=2026-11-06$/)
    await expect(chartRows(page)).toHaveCount(2)
    await expect(chartRows(page).first()).toContainText('20 de octubre de 2026')
    await expect(page.getByRole('radio', { name: '30 días' })).toBeChecked()
    expect(
      requests.some(
        (r) => paramsOf(r).from === '2026-10-07' && paramsOf(r).to === TODAY,
      ),
    ).toBe(true)
  })

  test('un rango con "desde" posterior a "hasta" se corrige antes de pedir datos', async ({
    page,
  }) => {
    const requests = await routeWeights(page, [today(), oct1(), oct20()])
    await openProgress(page)

    await page
      .getByRole('radio', { name: 'Personalizado' })
      .check({ force: true })
    await page.getByLabel('Desde').fill('2026-11-05')
    await page.getByLabel('Hasta').fill('2026-11-01')
    await page.getByRole('button', { name: 'Aplicar rango' }).click()

    await expect(
      page.getByText('La fecha desde no puede ser posterior a la fecha hasta'),
    ).toBeVisible()
    await expect(page.getByLabel('Desde')).toBeFocused()
    await expect(page).not.toHaveURL(/from=/)
    expect(requests.some((r) => paramsOf(r).from === '2026-11-05')).toBe(false)
  })

  test('un rango personalizado válido se aplica y queda en la URL', async ({
    page,
  }) => {
    await routeWeights(page, [today(), oct1(), oct20()])
    await openProgress(page)

    await page
      .getByRole('radio', { name: 'Personalizado' })
      .check({ force: true })
    await page.getByLabel('Desde').fill('2026-10-01')
    await page.getByLabel('Hasta').fill('2026-10-31')
    await page.getByRole('button', { name: 'Aplicar rango' }).click()

    await expect(page).toHaveURL(/\?from=2026-10-01&to=2026-10-31$/)
    await expect(chartRows(page)).toHaveCount(2)
  })

  test('un enlace con un rango que el backend rechaza muestra su mensaje sin "Reintentar"', async ({
    page,
  }) => {
    await routeWeights(page, [today(), oct1(), oct20()], {
      badRangeFrom: '2026-09-01',
    })

    await openProgress(page, '?from=2026-09-01&to=2026-09-30')

    await expect(
      page.getByRole('alert').filter({
        hasText: 'La solicitud tiene campos inválidos',
      }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(
      0,
    )
  })

  test('sin ningún registro, ofrece cargar el peso y lleva el foco al campo', async ({
    page,
  }) => {
    await routeWeights(page, [])
    await openProgress(page)

    await expect(
      page.getByText('Todavía no hay datos para graficar'),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Cargar mi peso' }).click()

    await expect(weightField(page)).toBeFocused()
  })

  test('con un solo registro dibuja el punto y explica que hace falta otro día', async ({
    page,
  }) => {
    await routeWeights(page, [today()])

    await openProgress(page)

    await expect(chart(page).locator('circle')).toHaveCount(1)
    await expect(
      page.getByText(
        'Con un solo registro se ve el punto. Cargá otro día para ver la línea.',
      ),
    ).toBeVisible()
  })

  test('registrar un peso actualiza el gráfico sin recargar la página', async ({
    page,
  }) => {
    await routeWeights(page, [oct1()])
    await openProgress(page)
    await expect(chartRows(page)).toHaveCount(1)

    await weightField(page).fill('72.5')
    await page.getByRole('button', { name: 'Registrar peso' }).click()

    await expect(
      page.getByRole('status').filter({
        hasText: 'Registraste 72,5 kg para el 6 de noviembre de 2026.',
      }),
    ).toBeVisible()
    await expect(chartRows(page)).toHaveCount(2)
    await expect(chartRows(page).last()).toContainText('72,5 kg')
  })

  test('en un celular de 360 px la tarjeta cabe sin scroll horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await routeWeights(page, [today(), oct1(), oct20()])

    await openProgress(page)
    await expect(chart(page)).toBeVisible()

    // el código de la página va como texto: los E2E no tienen los tipos del DOM
    const overflow = await page.evaluate(
      'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    )
    expect(overflow).toBeLessThanOrEqual(0)
    const box = await chart(page).boundingBox()
    expect(box!.width).toBeLessThanOrEqual(360)
  })
})

test.describe('como atleta · galería de fotos cronológica', () => {
  test.use({ timezoneId: 'UTC' })

  const photoJson = (id: number, overrides: Record<string, unknown>) => ({
    id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    type: 'FRONT',
    takenOn: '2026-10-01',
    url: `https://storage.example.test/fotos/${id}.png?token=viejo-${id}`,
    urlExpiresAt: FUTURE,
    createdAt: '2026-10-01T12:00:00Z',
    ...overrides,
  })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
    await routeWeights(page, [])
  })

  test('ordena las fotos de la más antigua a la más nueva y renueva solo la URL vencida (CE-4)', async ({
    page,
  }) => {
    // la foto más nueva llega con la URL ya vencida; la más antigua, con una URL vigente
    const older = photoJson(1, {
      type: 'FRONT',
      takenOn: '2026-10-01',
      urlExpiresAt: FUTURE,
    })
    const newer = photoJson(2, {
      type: 'SIDE',
      takenOn: '2026-10-15',
      urlExpiresAt: PAST,
    })
    const photos = [older, newer]
    const details: Request[] = []

    await page.route(PHOTOS_URL, (route) =>
      route.fulfill({
        status: 200,
        json: {
          content: photos,
          page: 0,
          size: 20,
          totalElements: photos.length,
          totalPages: 1,
        },
      }),
    )
    await page.route(PHOTO_URL, (route) => {
      details.push(route.request())
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

    await openProgress(page)

    const items = page
      .getByRole('list', { name: 'Fotos de progreso' })
      .getByRole('listitem')
    await expect(items).toHaveCount(2)
    await expect(items.first()).toContainText('1 de octubre de 2026')
    await expect(items.last()).toContainText('15 de octubre de 2026')
    await expect(
      page
        .getByRole('button', {
          name: 'Ver la foto Lateral del 15 de octubre de 2026',
        })
        .locator('img'),
    ).toHaveAttribute('src', /token=nuevo/)
    // solo la foto vencida se pide de nuevo, una vez
    expect(details).toHaveLength(1)
    expect(new URL(details[0].url()).pathname).toBe(
      `/api/athletes/${athlete.id}/photos/${newer.id}`,
    )
  })

  test('sin fotos, "Subir mi primera foto" lleva el foco al selector de archivo', async ({
    page,
  }) => {
    await page.route(PHOTOS_URL, (route) =>
      route.fulfill({
        status: 200,
        json: {
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
        },
      }),
    )

    await openProgress(page)

    await page.getByRole('button', { name: 'Subir mi primera foto' }).click()

    await expect(page.locator('#progress-photos-upload-file')).toBeFocused()
  })
})
