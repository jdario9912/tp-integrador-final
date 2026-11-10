import { expect, test, type Page, type Request } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// GET (lista o un día) y POST del alta; PUT de la edición
const WEIGHTS_URL = /\/api\/athletes\/[^/]+\/weights(\?.*)?$/
const WEIGHT_URL = /\/api\/athletes\/[^/]+\/weights\/[^/?]+$/

// 23:30 del 6/11 en Argentina. El navegador del test está en UTC, donde ya es el 7:
// el "hoy" de la app tiene que seguir siendo el 6 (contrato de API, 8.8)
const NOW = new Date('2026-11-07T02:30:00Z')
const TODAY = '2026-11-06'

type WeightJson = {
  id: string
  date: string
  weightKg: number
  comment: string | null
  createdAt: string
  updatedAt: string
}

const weightJson = (
  id: number,
  overrides: Partial<WeightJson>,
): WeightJson => ({
  id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
  date: TODAY,
  weightKg: 72.5,
  comment: null,
  createdAt: '2026-11-06T11:20:31Z',
  updatedAt: '2026-11-06T11:20:31Z',
  ...overrides,
})

const todayRecord = () =>
  weightJson(1, { date: TODAY, weightKg: 72.5, comment: 'En ayunas' })
const olderRecord = () => weightJson(2, { date: '2026-11-01', weightKg: 73.1 })

const ddmmyyyy = (isoDate: string) => isoDate.split('-').reverse().join('/')

// imita al backend de US-26 en memoria: lista paginada por fecha descendente, alta y
// edición con un registro por día (409)
const routeBackend = async (
  page: Page,
  initial: WeightJson[] = [todayRecord(), olderRecord()],
) => {
  let records = initial
  let nextId = 100
  const requests: Request[] = []
  const pathOf = (request: Request) =>
    new URL(request.url()).pathname.replace('/api', '')

  const conflict = (date: string, path: string) => ({
    status: 409,
    json: {
      ...apiError(
        409,
        `Ya existe un registro de peso para el ${ddmmyyyy(date)}`,
        path,
      ).json,
      error: 'Conflict',
    },
  })

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
        return route.fulfill(conflict(body.date, path))
      }
      const created = weightJson(nextId++, body)
      records = [...records, created]
      return route.fulfill({ status: 201, json: created })
    }

    const params = new URL(request.url()).searchParams
    const from = params.get('from') ?? '0000-00-00'
    const to = params.get('to') ?? '9999-99-99'
    const pageNumber = Number(params.get('page') ?? 0)
    const size = Number(params.get('size') ?? 20)
    const matching = records
      .filter((r) => r.date >= from && r.date <= to)
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

  await page.route(WEIGHT_URL, (route) => {
    const request = route.request()
    requests.push(request)
    const path = pathOf(request)
    const id = path.split('/').at(-1)
    const record = records.find((r) => r.id === id)
    if (!record) {
      return route.fulfill(
        apiError(404, `No existe el registro de peso con id ${id}`, path),
      )
    }
    const body = request.postDataJSON() as Omit<WeightJson, 'id'>
    if (records.some((r) => r.date === body.date && r.id !== id)) {
      return route.fulfill(conflict(body.date, path))
    }
    const updated = { ...record, ...body, updatedAt: '2026-11-07T02:31:00Z' }
    records = records.map((r) => (r.id === id ? updated : r))
    return route.fulfill({ status: 200, json: updated })
  })

  return requests
}

const paramsOf = (request: Request) =>
  Object.fromEntries(new URL(request.url()).searchParams)

const latestItems = (page: Page) =>
  page.getByRole('list', { name: 'Últimos registros' }).getByRole('listitem')

const weightField = (page: Page) =>
  page.getByRole('spinbutton', { name: /Peso/ })

// la URL cambia antes de que React muestre la página (la navegación es una transición)
const openProgress = async (page: Page) => {
  await page.goto(paths.progress)
  await expect(
    page.getByRole('heading', { name: 'Progreso', level: 1 }),
  ).toBeVisible()
}

test.describe('como atleta', () => {
  test.use({ timezoneId: 'UTC' })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
  })

  test('entra a Progreso desde el menú y ve sus últimos registros', async ({
    page,
  }) => {
    const requests = await routeBackend(page)
    await page.goto(paths.dashboard)

    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Progreso' })
      .click()

    await expect(page).toHaveURL(paths.progress)
    await expect(
      page.getByRole('navigation', { name: 'Ubicación' }),
    ).toContainText('Progreso')
    await expect(latestItems(page)).toHaveCount(2)
    await expect(latestItems(page).first()).toContainText('72,5 kg')
    await expect(latestItems(page).first()).toContainText(
      '6 de noviembre de 2026',
    )
    await expect(latestItems(page).first()).toContainText('En ayunas')
    await expect(latestItems(page).first()).toContainText('Hoy')
    await expect(latestItems(page).last()).toContainText('73,1 kg')

    const list = requests.find((r) => r.method() === 'GET')!
    expect(new URL(list.url()).pathname).toBe(
      `/api/athletes/${athlete.id}/weights`,
    )
    expect(paramsOf(list)).toEqual({ size: '10' })
    expect(list.headers().authorization).toBe('Bearer access-1')
  })

  test('sin registros muestra el estado vacío', async ({ page }) => {
    await routeBackend(page, [])

    await openProgress(page)

    await expect(page.getByText('Todavía no registraste tu peso')).toBeVisible()
  })

  test('registra su peso con la fecha de hoy en Argentina y lo ve en la lista', async ({
    page,
  }) => {
    const requests = await routeBackend(page, [olderRecord()])
    await openProgress(page)
    await expect(latestItems(page)).toHaveCount(1)

    await expect(page.getByLabel('Fecha')).toHaveValue(TODAY)
    await weightField(page).fill('72.5')
    await page.getByLabel('Comentario').fill('  En ayunas  ')
    await page.getByRole('button', { name: 'Registrar peso' }).click()

    await expect(
      page.getByRole('status').filter({
        hasText: 'Registraste 72,5 kg para el 6 de noviembre de 2026.',
      }),
    ).toBeVisible()
    expect(requests.find((r) => r.method() === 'POST')?.postDataJSON()).toEqual(
      { date: TODAY, weightKg: 72.5, comment: 'En ayunas' },
    )
    await expect(latestItems(page)).toHaveCount(2)
    await expect(latestItems(page).first()).toContainText('72,5 kg')
    await expect(latestItems(page).first()).toContainText('Hoy')
    // el formulario queda listo para otro registro
    await expect(weightField(page)).toHaveValue('')
  })

  test('valida el formulario antes de enviar', async ({ page }) => {
    const requests = await routeBackend(page, [])
    await openProgress(page)

    await page.getByRole('button', { name: 'Registrar peso' }).click()
    await expect(page.getByText('El peso es obligatorio')).toBeVisible()
    await expect(weightField(page)).toBeFocused()

    await weightField(page).fill('19')
    await weightField(page).blur()
    await expect(
      page.getByText('El peso debe estar entre 20 y 300 kg'),
    ).toBeVisible()

    await weightField(page).fill('72.5')
    await page.getByLabel('Fecha').fill('2026-11-07')
    await page.getByRole('button', { name: 'Registrar peso' }).click()
    await expect(page.getByText('La fecha no puede ser futura')).toBeVisible()

    expect(requests.some((r) => r.method() === 'POST')).toBe(false)
  })

  test('edita un registro de la lista', async ({ page }) => {
    const requests = await routeBackend(page)
    await openProgress(page)

    await page
      .getByRole('button', {
        name: 'Editar el registro del 1 de noviembre de 2026',
      })
      .click()

    await expect(
      page.getByRole('heading', { name: 'Editar registro', level: 2 }),
    ).toBeFocused()
    await expect(page.getByLabel('Fecha')).toHaveValue('2026-11-01')
    await expect(weightField(page)).toHaveValue('73.1')
    await weightField(page).fill('72.9')
    await page.getByLabel('Comentario').fill('Después de entrenar')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(
      page.getByRole('status').filter({
        hasText:
          'Guardaste los cambios del registro del 1 de noviembre de 2026.',
      }),
    ).toBeVisible()
    const edit = requests.find((r) => r.method() === 'PUT')!
    expect(new URL(edit.url()).pathname).toBe(
      `/api/athletes/${athlete.id}/weights/${olderRecord().id}`,
    )
    expect(edit.postDataJSON()).toEqual({
      date: '2026-11-01',
      weightKg: 72.9,
      comment: 'Después de entrenar',
    })
    await expect(latestItems(page).last()).toContainText('72,9 kg')
    await expect(latestItems(page).last()).toContainText('Después de entrenar')
    await expect(
      page.getByRole('heading', { name: 'Registrar peso', level: 2 }),
    ).toBeVisible()
  })

  test('si ya registró ese día, ofrece editar ese registro', async ({
    page,
  }) => {
    const requests = await routeBackend(page)
    await openProgress(page)

    await weightField(page).fill('73')
    await page.getByRole('button', { name: 'Registrar peso' }).click()

    const notice = page.getByRole('note').filter({
      hasText: 'Ya registraste tu peso ese día.',
    })
    await expect(notice).toContainText(
      'El 6 de noviembre de 2026 tiene un registro de 72,5 kg.',
    )
    const dayLookup = requests.find((r) => paramsOf(r).from === TODAY)!
    expect(paramsOf(dayLookup)).toEqual({ from: TODAY, to: TODAY, size: '1' })

    await notice.getByRole('button', { name: 'Editar ese registro' }).click()
    await expect(
      page.getByRole('heading', { name: 'Editar registro', level: 2 }),
    ).toBeFocused()
    await expect(weightField(page)).toHaveValue('72.5')
    await weightField(page).fill('73')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(
      page.getByRole('status').filter({
        hasText:
          'Guardaste los cambios del registro del 6 de noviembre de 2026.',
      }),
    ).toBeVisible()
    await expect(latestItems(page)).toHaveCount(2)
    await expect(latestItems(page).first()).toContainText('73 kg')
    expect(requests.filter((r) => r.method() === 'PUT')).toHaveLength(1)
  })
})

test('un entrenador no puede entrar a Progreso', async ({ page }) => {
  await seedSession(page, coach, 'access-1')
  await routeCurrentUser(page, coach)

  await page.goto(paths.progress)

  await expect(page).toHaveURL(paths.dashboard)
  await expect(
    page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Progreso' }),
  ).toHaveCount(0)
})
