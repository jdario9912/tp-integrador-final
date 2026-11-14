import { expect, test, type Page, type Request } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// fotos: listado y alta (/photos), detalle (renovación) y borrado (/photos/{photoId})
const PHOTOS_URL = /\/api\/athletes\/[^/]+\/photos(\?.*)?$/
const PHOTO_URL = /\/api\/athletes\/[^/]+\/photos\/[^/?]+$/
// los pesos quedan vacíos: esta prueba se enfoca en las fotos
const WEIGHTS_URL = /\/api\/athletes\/[^/]+\/weights(\?.*)?$/
// hosting de las imágenes firmadas (en E2E, la URL firmada es cualquier string)
const STORAGE_URL = /https:\/\/storage\.example\.test\/.*/

// 23:30 del 6/11 en Argentina: el "hoy" de la app es el 6 (contrato, 8.8)
const NOW = new Date('2026-11-07T02:30:00Z')

// PNG de 1 píxel: basta para que el <img> cargue
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const FUTURE = '2099-01-01T00:00:00Z'
const PAST = '2000-01-01T00:00:00Z'

type PhotoJson = {
  id: string
  type: 'FRONT' | 'SIDE' | 'BACK'
  takenOn: string
  url: string
  urlExpiresAt: string
  createdAt: string
}

const photoJson = (id: number, overrides: Partial<PhotoJson>): PhotoJson => ({
  id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
  type: 'FRONT',
  takenOn: '2026-10-01',
  url: `https://storage.example.test/fotos/${id}.png?token=viejo-${id}`,
  urlExpiresAt: FUTURE,
  createdAt: '2026-10-01T12:00:00Z',
  ...overrides,
})

const frontOld = () => photoJson(1, { type: 'FRONT', takenOn: '2026-10-01' })
const sideMiddle = () => photoJson(2, { type: 'SIDE', takenOn: '2026-10-15' })

const pageOf = (content: PhotoJson[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
})

// imita al backend de US-28 en memoria: lista cronológica, alta, detalle con URL nueva
// y borrado. `failList` simula Supabase caído (503)
const routeBackend = async (
  page: Page,
  options: { initial?: PhotoJson[]; failList?: boolean } = {},
) => {
  let photos = options.initial ?? [frontOld(), sideMiddle()]
  let nextId = 100
  const requests: Request[] = []
  const pathOf = (request: Request) =>
    new URL(request.url()).pathname.replace('/api', '')

  await page.route(WEIGHTS_URL, (route) =>
    route.fulfill({
      status: 200,
      json: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 },
    }),
  )

  await page.route(PHOTOS_URL, (route) => {
    const request = route.request()
    requests.push(request)
    const path = pathOf(request)
    if (!path.startsWith(`/athletes/${athlete.id}/`)) {
      return route.fulfill(
        apiError(403, 'No tiene permisos para acceder a este atleta', path),
      )
    }

    if (request.method() === 'POST') {
      // la subida llega como multipart: el tipo viene en su propia parte
      const body = request.postData() ?? ''
      const type = /name="type"\r\n\r\n(\w+)/.exec(body)?.[1] ?? 'FRONT'
      const created = photoJson(nextId++, {
        type: type as PhotoJson['type'],
        takenOn: '2026-11-06',
        createdAt: '2026-11-06T23:31:00Z',
      })
      photos = [...photos, created]
      return route.fulfill({ status: 201, json: created })
    }

    if (options.failList) {
      return route.fulfill(
        apiError(503, 'El servicio de almacenamiento no está disponible', path),
      )
    }
    return route.fulfill({
      status: 200,
      json: pageOf(
        [...photos].sort((a, b) => a.takenOn.localeCompare(b.takenOn)),
      ),
    })
  })

  await page.route(PHOTO_URL, (route) => {
    const request = route.request()
    requests.push(request)
    const path = pathOf(request)
    const id = path.split('/').at(-1)!
    const photo = photos.find((p) => p.id === id)

    if (request.method() === 'DELETE') {
      if (!photo) {
        return route.fulfill(
          apiError(404, `No existe la foto de progreso con id ${id}`, path),
        )
      }
      photos = photos.filter((p) => p.id !== id)
      return route.fulfill({ status: 204 })
    }

    // GET del detalle: devuelve la foto con una URL firmada nueva
    if (!photo) {
      return route.fulfill(
        apiError(404, `No existe la foto de progreso con id ${id}`, path),
      )
    }
    return route.fulfill({
      status: 200,
      json: {
        ...photo,
        url: `https://storage.example.test/fotos/${id}.png?token=nuevo`,
        urlExpiresAt: FUTURE,
      },
    })
  })

  // las imágenes firmadas: una PNG válida
  await page.route(STORAGE_URL, (route) =>
    route.fulfill({ status: 200, body: PNG_1X1, contentType: 'image/png' }),
  )

  return requests
}

const photosList = (page: Page) =>
  page.getByRole('list', { name: 'Fotos de progreso' }).getByRole('listitem')

const photoInput = (page: Page) => page.locator('input[type="file"]')

const openProgress = async (page: Page) => {
  await page.goto(paths.progress)
  await expect(
    page.getByRole('heading', { name: 'Progreso', level: 1 }),
  ).toBeVisible()
}

test.describe('como atleta · fotos de progreso', () => {
  test.use({ timezoneId: 'UTC' })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
  })

  test('ve sus fotos en orden cronológico, con su tipo y su fecha', async ({
    page,
  }) => {
    const requests = await routeBackend(page)

    await openProgress(page)

    await expect(photosList(page)).toHaveCount(2)
    await expect(photosList(page).first()).toContainText('Frontal')
    await expect(photosList(page).first()).toContainText('1 de octubre de 2026')
    await expect(photosList(page).last()).toContainText('Lateral')
    await expect(photosList(page).last()).toContainText('15 de octubre de 2026')

    const list = requests.find((r) => r.method() === 'GET')!
    expect(new URL(list.url()).pathname).toBe(
      `/api/athletes/${athlete.id}/photos`,
    )
    expect(list.headers().authorization).toBe('Bearer access-1')
  })

  test('sin fotos muestra el estado vacío', async ({ page }) => {
    await routeBackend(page, { initial: [] })

    await openProgress(page)

    await expect(
      page.getByRole('heading', {
        name: 'Todavía no subiste fotos de progreso',
      }),
    ).toBeVisible()
  })

  test('sube una foto con el tipo elegido y la ve en la línea de tiempo', async ({
    page,
  }) => {
    const requests = await routeBackend(page)
    await openProgress(page)
    await expect(photosList(page)).toHaveCount(2)

    await page.getByRole('radio', { name: 'Espalda' }).check({ force: true })
    await photoInput(page).setInputFiles({
      name: 'espalda.png',
      mimeType: 'image/png',
      buffer: PNG_1X1,
    })
    await page.getByRole('button', { name: 'Subir foto' }).click()

    await expect(
      page.getByRole('status').filter({
        hasText: 'Subiste la foto Espalda del 6 de noviembre de 2026.',
      }),
    ).toBeVisible()
    const upload = requests.find((r) => r.method() === 'POST')!
    expect(upload.headers()['content-type']).toMatch(/^multipart\/form-data/)
    expect(upload.postData()).toContain('BACK')
    await expect(photosList(page)).toHaveCount(3)
    await expect(photosList(page).last()).toContainText('Espalda')
  })

  test('valida el formato y el tamaño antes de subir', async ({ page }) => {
    const requests = await routeBackend(page)
    await openProgress(page)
    await expect(photosList(page)).toHaveCount(2)

    await photoInput(page).setInputFiles({
      name: 'cv.gif',
      mimeType: 'image/gif',
      buffer: PNG_1X1,
    })
    await expect(
      page.getByText('Formato no permitido. Subí una foto en JPG, PNG o WebP'),
    ).toBeVisible()

    await photoInput(page).setInputFiles({
      name: 'grande.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    })
    await expect(
      page.getByText('La foto supera el tamaño máximo de 5 MB'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Subir foto' }).click()
    expect(requests.some((r) => r.method() === 'POST')).toBe(false)
  })

  test('abre la foto en grande y la borra con confirmación', async ({
    page,
  }) => {
    const requests = await routeBackend(page)
    await openProgress(page)
    await expect(photosList(page)).toHaveCount(2)

    await page
      .getByRole('button', {
        name: 'Ver la foto Frontal del 1 de octubre de 2026',
      })
      .click()
    const viewer = page.getByRole('dialog', {
      name: 'Frontal, 1 de octubre de 2026',
    })
    await expect(viewer).toBeVisible()
    await expect(viewer.getByText('Foto 1 de 2')).toBeVisible()

    await viewer.getByRole('button', { name: 'Borrar foto' }).click()
    const confirm = page.getByRole('dialog', { name: '¿Borrar esta foto?' })
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Borrar foto' }).click()

    await expect(
      page.getByRole('status').filter({
        hasText: 'Borraste la foto Frontal del 1 de octubre de 2026.',
      }),
    ).toBeVisible()
    const remove = requests.find((r) => r.method() === 'DELETE')!
    expect(new URL(remove.url()).pathname).toBe(
      `/api/athletes/${athlete.id}/photos/${frontOld().id}`,
    )
    await expect(photosList(page)).toHaveCount(1)
  })

  test('si la URL firmada venció, pide la foto una vez y muestra la URL nueva', async ({
    page,
  }) => {
    const expired = photoJson(1, {
      type: 'FRONT',
      takenOn: '2026-10-01',
      urlExpiresAt: PAST,
    })
    const requests = await routeBackend(page, { initial: [expired] })

    await openProgress(page)

    await expect(photosList(page)).toHaveCount(1)
    await expect(
      page
        .getByRole('button', {
          name: 'Ver la foto Frontal del 1 de octubre de 2026',
        })
        .locator('img'),
    ).toHaveAttribute('src', /token=nuevo/)
    const detail = requests.filter(
      (r) => r.method() === 'GET' && PHOTO_URL.test(r.url()),
    )
    expect(detail).toHaveLength(1)
  })

  test('si Supabase no responde, lo dice con un mensaje claro', async ({
    page,
  }) => {
    await routeBackend(page, { failList: true })

    await openProgress(page)

    await expect(
      page.getByRole('alert').filter({
        hasText: 'No pudimos cargar tus fotos. Intentá nuevamente más tarde.',
      }),
    ).toBeVisible()
  })
})
