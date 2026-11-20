import { expect, test, type Page, type Request } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// US-45: registro de medidas corporales (un registro por día, 409 y edición completa) y su
// evolución en el selector de /progress. La API se intercepta: no hay backend
const WEIGHTS_URL = /\/api\/athletes\/[^/]+\/weights(\?.*)?$/
const PHOTOS_URL = /\/api\/athletes\/[^/]+\/photos(\?.*)?$/
const CATALOG_URL = /\/api\/body-measurement-types$/
const MEASURES_URL = /\/api\/athletes\/[^/]+\/measurements(\/[^/?]+)?(\?.*)?$/

// 23:30 del 6/11 en Argentina: el "hoy" de la app es el 6 (contrato, 8.8)
const NOW = new Date('2026-11-07T02:30:00Z')
const TODAY = '2026-11-06'
const DAY_MESSAGE = 'Ya existe un registro de medidas para el 06/11/2026'

// catálogo de GET /api/body-measurement-types (contrato 17.2)
const CATALOG = [
  {
    code: 'WAIST',
    name: 'Cintura',
    unit: 'cm',
    bilateral: false,
    min: 20,
    max: 300,
  },
  {
    code: 'CHEST',
    name: 'Pecho',
    unit: 'cm',
    bilateral: false,
    min: 20,
    max: 300,
  },
  {
    code: 'HIP',
    name: 'Cadera',
    unit: 'cm',
    bilateral: false,
    min: 20,
    max: 300,
  },
  { code: 'ARM', name: 'Brazo', unit: 'cm', bilateral: true, min: 5, max: 100 },
  {
    code: 'LEG',
    name: 'Pierna (muslo)',
    unit: 'cm',
    bilateral: true,
    min: 10,
    max: 150,
  },
  {
    code: 'BODY_FAT',
    name: '% de grasa',
    unit: '%',
    bilateral: false,
    min: 1,
    max: 75,
  },
]

type Value = { type: string; side?: 'LEFT' | 'RIGHT' | null; value: number }

type RecordJson = {
  id: string
  date: string
  comment: string | null
  values: { type: string; side: 'LEFT' | 'RIGHT' | null; value: number }[]
  createdAt: string
  updatedAt: string
}

// el valor que la API guarda: el lado va en null cuando la medida no es bilateral
const toRecordValue = (value: Value) => ({
  type: value.type,
  side: value.side ?? null,
  value: value.value,
})

const recordJson = (n: number, overrides: Partial<RecordJson>): RecordJson => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  date: TODAY,
  comment: null,
  values: [],
  createdAt: '2026-11-06T11:20:31Z',
  updatedAt: '2026-11-06T11:20:31Z',
  ...overrides,
})

const todayRecord = () =>
  recordJson(1, {
    date: TODAY,
    comment: 'Después de entrenar',
    values: [
      { type: 'WAIST', side: null, value: 84.5 },
      { type: 'ARM', side: 'RIGHT', value: 35.25 },
    ],
  })

const oldRecord = () =>
  recordJson(2, {
    date: '2026-10-30',
    values: [{ type: 'WAIST', side: null, value: 86 }],
  })

// imita al backend de US-45 en memoria: listado por fecha descendente con from/to inclusivos,
// alta con un registro por día (409) y edición que reemplaza la lista de valores
const routeMeasurements = async (page: Page, initial: RecordJson[]) => {
  let records = initial
  let nextId = 100
  const posted: Request[] = []
  const pathOf = (request: Request) =>
    new URL(request.url()).pathname.replace('/api', '')

  await page.route(MEASURES_URL, (route) => {
    const request = route.request()
    const path = pathOf(request)
    if (!path.startsWith(`/athletes/${athlete.id}/measurements`)) {
      return route.fulfill(
        apiError(403, 'No tiene permisos para acceder a este atleta', path),
      )
    }

    if (request.method() === 'POST' || request.method() === 'PUT') {
      posted.push(request)
    }
    const body =
      request.method() === 'GET'
        ? null
        : (request.postDataJSON() as {
            date: string
            comment: string | null
            values: Value[]
          })

    if (request.method() === 'POST') {
      if (records.some((r) => r.date === body!.date)) {
        return route.fulfill({
          status: 409,
          json: { ...apiError(409, DAY_MESSAGE, path).json, error: 'Conflict' },
        })
      }
      const created = recordJson(nextId++, {
        date: body!.date,
        comment: body!.comment,
        values: body!.values.map((v) => toRecordValue(v)),
      })
      records = [...records, created]
      return route.fulfill({ status: 201, json: created })
    }

    if (request.method() === 'PUT') {
      const recordId = path.split('/').pop()!
      const current = records.find((r) => r.id === recordId)
      if (!current) {
        return route.fulfill(
          apiError(
            404,
            `No existe el registro de medidas con id ${recordId}`,
            path,
          ),
        )
      }
      if (records.some((r) => r.id !== recordId && r.date === body!.date)) {
        return route.fulfill({
          status: 409,
          json: { ...apiError(409, DAY_MESSAGE, path).json, error: 'Conflict' },
        })
      }
      const updated: RecordJson = {
        ...current,
        date: body!.date,
        comment: body!.comment,
        values: body!.values.map((v) => toRecordValue(v)),
        updatedAt: '2026-11-07T02:31:00Z',
      }
      records = records.map((r) => (r.id === recordId ? updated : r))
      return route.fulfill({ status: 200, json: updated })
    }

    const params = new URL(request.url()).searchParams
    const from = params.get('from')
    const to = params.get('to')
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

  return posted
}

const openProgress = async (page: Page, search = '') => {
  await page.goto(`${paths.progress}${search}`)
  await expect(
    page.getByRole('heading', { name: 'Progreso', level: 1 }),
  ).toBeVisible()
}

const section = (page: Page) =>
  page.getByRole('heading', { name: 'Medidas corporales', level: 2 })

const submitMeasures = (page: Page) =>
  page.getByRole('button', { name: 'Registrar medidas', exact: true }).click()

test.describe('como atleta · medidas corporales', () => {
  test.use({ timezoneId: 'UTC' })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
    // catálogo fijo; los pesos y las fotos no son parte de estas pruebas
    await page.route(CATALOG_URL, (route) =>
      route.fulfill({ status: 200, json: CATALOG }),
    )
    await page.route(WEIGHTS_URL, (route) =>
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

  test('registra medidas con lado izquierdo y derecho, y las ve en la lista', async ({
    page,
  }) => {
    const posted = await routeMeasurements(page, [])
    await openProgress(page)
    await expect(section(page)).toBeVisible()

    await page.getByLabel('Cintura', { exact: true }).fill('84.5')
    await page.getByLabel('Brazo, lado izquierdo', { exact: true }).fill('34.8')
    await page.getByLabel('Brazo, lado derecho', { exact: true }).fill('35.25')
    await submitMeasures(page)

    await expect(
      page.getByText('Registraste las medidas del 6 de noviembre de 2026.'),
    ).toBeVisible()
    const list = page.getByRole('list', { name: 'Últimas medidas' })
    await expect(list).toContainText('Brazo, lado derecho')
    await expect(list).toContainText('35,25 cm')

    // el body lleva solo lo cargado, y el lado solo en las bilaterales
    const body = posted[0].postDataJSON()
    expect(body).toMatchObject({ date: TODAY, comment: null })
    expect(body.values).toEqual([
      { type: 'WAIST', value: 84.5 },
      { type: 'ARM', side: 'LEFT', value: 34.8 },
      { type: 'ARM', side: 'RIGHT', value: 35.25 },
    ])
  })

  test('un valor fuera del rango del catálogo se marca al salir del campo y no se envía', async ({
    page,
  }) => {
    const posted = await routeMeasurements(page, [])
    await openProgress(page)
    await expect(section(page)).toBeVisible()

    await page.getByLabel('Brazo, lado izquierdo', { exact: true }).fill('4')
    await page.getByLabel('Brazo, lado izquierdo', { exact: true }).blur()

    await expect(
      page.getByText('El valor debe estar entre 5 y 100'),
    ).toBeVisible()
    await submitMeasures(page)
    await expect(
      page.getByText('El valor debe estar entre 5 y 100').first(),
    ).toBeVisible()
    expect(posted).toHaveLength(0)
  })

  test('sin ninguna medida no envía y lo dice', async ({ page }) => {
    const posted = await routeMeasurements(page, [])
    await openProgress(page)
    await expect(section(page)).toBeVisible()

    await submitMeasures(page)

    await expect(
      page.getByText('Cargá al menos una medida para guardar el registro.'),
    ).toBeVisible()
    expect(posted).toHaveLength(0)
  })

  test('un día ya registrado ofrece editar; guardar reemplaza la lista de medidas', async ({
    page,
  }) => {
    const posted = await routeMeasurements(page, [todayRecord()])
    await openProgress(page)
    await expect(section(page)).toBeVisible()

    await page.getByLabel('Cintura', { exact: true }).fill('85')
    await submitMeasures(page)

    await expect(
      page.getByText('Ya cargaste tus medidas ese día.'),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Editar ese registro' }).click()

    // el formulario abre con lo que ya estaba guardado
    await expect(
      page.getByRole('heading', { name: 'Editar medidas', level: 2 }),
    ).toBeVisible()
    await expect(page.getByLabel('Cintura', { exact: true })).toHaveValue(
      '84.5',
    )

    // se quita el brazo derecho y se corrige la cintura: el PUT manda la lista completa
    await page.getByLabel('Brazo, lado derecho', { exact: true }).fill('')
    await page.getByLabel('Cintura', { exact: true }).fill('85')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(
      page.getByText('Guardaste las medidas del 6 de noviembre de 2026.'),
    ).toBeVisible()
    const put = posted.find((request) => request.method() === 'PUT')!
    expect(put.postDataJSON()).toMatchObject({
      date: TODAY,
      values: [{ type: 'WAIST', value: 85 }],
    })
  })

  test('la evolución grafica una medida con su unidad y el selector cambia de medida', async ({
    page,
  }) => {
    await routeMeasurements(page, [todayRecord(), oldRecord()])
    await openProgress(page, '?metric=WAIST')

    const chart = page.getByRole('img', { name: 'Evolución: Cintura' })
    await expect(chart).toBeVisible()
    await expect(chart).toHaveAccessibleDescription(
      /^2 registros, del 30 de octubre de 2026 al 6 de noviembre de 2026\. De 86 cm a 84,5 cm\./,
    )

    await page.getByLabel('Medida', { exact: true }).selectOption('ARM-RIGHT')

    await expect(page).toHaveURL(/metric=ARM-RIGHT/)
    await expect(
      page.getByRole('img', { name: 'Evolución: Brazo, lado derecho' }),
    ).toBeVisible()
  })

  test('la sección de medidas no hace scroll horizontal en un celular de 360 px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await routeMeasurements(page, [todayRecord()])
    await openProgress(page)
    await expect(section(page)).toBeVisible()

    // en texto: el tsconfig de los E2E no incluye los tipos del DOM
    const scrollsSideways = await page.evaluate(
      'document.documentElement.scrollWidth > document.documentElement.clientWidth',
    )
    expect(scrollsSideways).toBe(false)
  })
})
