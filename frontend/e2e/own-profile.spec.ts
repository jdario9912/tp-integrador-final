import { expect, test, type Page, type Request } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import { athlete, coach, seedSession } from './auth-helpers.ts'

// US-48: perfil propio. Todo va por /api/users/me/* (sin id en la ruta) y la API se intercepta
const PROFILE_URL = /\/api\/users\/me\/profile$/
const PASSWORD_URL = /\/api\/users\/me\/password$/
const PHOTO_URL = /\/api\/users\/me\/photo$/
// hosting de las imágenes firmadas: devuelve un PNG de 1 píxel para que el <img> cargue
const STORAGE_URL = /https:\/\/storage\.example\.test\/.*/

const FUTURE = '2099-01-01T00:00:00Z'

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

type User = typeof athlete | typeof coach

type ProfileState = {
  firstName: string
  lastName: string
  email: string
  phone: string | null
  hasPhoto: boolean
  photoVersion: number
}

// UserProfileResponse (contrato de US-48, 18.2): la URL firmada cambia con cada versión de la foto
const toProfileJson = (user: User, state: ProfileState) => ({
  id: user.id,
  role: user.role,
  firstName: state.firstName,
  lastName: state.lastName,
  email: state.email,
  phone: state.phone,
  photoUrl: state.hasPhoto
    ? `https://storage.example.test/perfil-${state.photoVersion}.png?token=v${state.photoVersion}`
    : null,
  photoUrlExpiresAt: state.hasPhoto ? FUTURE : null,
})

const errorJson = (
  status: number,
  message: string,
  path: string,
  fieldErrors?: unknown,
) => ({
  timestamp: '2026-11-20T15:00:00Z',
  status,
  error: status === 409 ? 'Conflict' : 'Bad Request',
  message,
  path: `/api${path}`,
  ...(fieldErrors ? { fieldErrors } : {}),
})

// imita al backend de US-48 en memoria. `emailTaken` simula un email de otro usuario (409)
const routeOwnProfile = async (
  page: Page,
  user: User,
  options: { emailTaken?: string[] } = {},
) => {
  let state: ProfileState = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: null,
    hasPhoto: false,
    photoVersion: 0,
  }
  const requests: Request[] = []

  await page.route(STORAGE_URL, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }),
  )

  await page.route(PROFILE_URL, (route) => {
    const request = route.request()
    requests.push(request)
    if (request.method() === 'GET') {
      return route.fulfill({ status: 200, json: toProfileJson(user, state) })
    }

    const body = request.postDataJSON() as {
      firstName: string
      lastName: string
      email: string
      phone: string | null
    }
    if (options.emailTaken?.includes(body.email)) {
      return route.fulfill({
        status: 409,
        json: errorJson(
          409,
          `Ya existe un usuario registrado con el email ${body.email}`,
          '/users/me/profile',
        ),
      })
    }
    state = {
      ...state,
      firstName: body.firstName,
      lastName: body.lastName,
      // el backend guarda el email en minúsculas
      email: body.email.toLowerCase(),
      phone: body.phone,
    }
    return route.fulfill({ status: 200, json: toProfileJson(user, state) })
  })

  await page.route(PASSWORD_URL, (route) => {
    const request = route.request()
    requests.push(request)
    const body = request.postDataJSON() as { currentPassword: string }
    if (body.currentPassword !== 'vieja-123') {
      return route.fulfill({
        status: 400,
        json: errorJson(
          400,
          'La solicitud tiene campos inválidos',
          '/users/me/password',
          [
            {
              field: 'currentPassword',
              message: 'La contraseña actual no es correcta',
            },
          ],
        ),
      })
    }
    return route.fulfill({ status: 204 })
  })

  await page.route(PHOTO_URL, (route) => {
    const request = route.request()
    requests.push(request)
    if (request.method() === 'DELETE') {
      state = { ...state, hasPhoto: false }
      return route.fulfill({ status: 204 })
    }
    state = {
      ...state,
      hasPhoto: true,
      photoVersion: state.photoVersion + 1,
    }
    return route.fulfill({ status: 200, json: toProfileJson(user, state) })
  })

  return { requests }
}

const menuGroup = (page: Page) => page.getByRole('group', { name: 'Sesión' })

test.describe('Mi perfil (US-48)', () => {
  test('el atleta edita sus datos: el email se normaliza y el menú muestra el nombre nuevo', async ({
    page,
  }) => {
    const api = await routeOwnProfile(page, athlete)
    await seedSession(page, athlete, 'access-1')
    await page.goto(paths.profile)

    await expect(
      page.getByRole('heading', { name: 'Mi perfil', level: 1 }),
    ).toBeVisible()
    await page.getByLabel(/Nombre/).fill('Leonel')
    await page.getByLabel(/Email/).fill('  Leo.Nuevo@Example.com ')
    await page.getByRole('button', { name: 'Guardar datos' }).click()

    await expect(page.getByRole('status')).toHaveText('Guardamos tus datos.')
    // el formulario queda con lo que devolvió el servidor
    await expect(page.getByLabel(/Email/)).toHaveValue('leo.nuevo@example.com')
    await expect(menuGroup(page)).toContainText('Leonel Gil')

    const save = api.requests.find(
      (request) =>
        request.method() === 'PUT' && PROFILE_URL.test(request.url()),
    )
    expect(save?.postDataJSON()).toEqual({
      firstName: 'Leonel',
      lastName: 'Gil',
      email: 'Leo.Nuevo@Example.com',
      phone: null,
    })
  })

  test('sube una foto, la ve en el menú y la quita con confirmación', async ({
    page,
  }) => {
    const api = await routeOwnProfile(page, athlete)
    await seedSession(page, athlete, 'access-1')
    await page.goto(paths.profile)

    await page.getByLabel('Nueva foto').setInputFiles({
      name: 'perfil.png',
      mimeType: 'image/png',
      buffer: PNG_1X1,
    })
    await expect(page.getByText('Así va a verse')).toBeVisible()
    await page.getByRole('button', { name: 'Guardar foto' }).click()

    await expect(page.getByRole('status')).toHaveText(
      'Actualizamos tu foto de perfil.',
    )
    await expect(
      menuGroup(page).getByRole('img', { name: 'Leo Gil' }),
    ).toHaveAttribute('src', /perfil-1\.png/)

    const upload = api.requests.find(
      (request) => request.method() === 'PUT' && PHOTO_URL.test(request.url()),
    )
    expect(upload?.headers()['content-type']).toMatch(/^multipart\/form-data/)

    await page.getByRole('button', { name: 'Quitar foto' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Quitar foto' }).click()

    await expect(page.getByRole('status')).toHaveText(
      'Quitamos tu foto de perfil.',
    )
    // sin foto, el menú vuelve a las iniciales
    await expect(menuGroup(page).getByText('LG')).toBeVisible()
    expect(api.requests.some((request) => request.method() === 'DELETE')).toBe(
      true,
    )
  })

  test('una foto con formato no permitido se rechaza antes de subir', async ({
    page,
  }) => {
    const api = await routeOwnProfile(page, athlete)
    await seedSession(page, athlete, 'access-1')
    await page.goto(paths.profile)

    await page.getByLabel('Nueva foto').setInputFiles({
      name: 'animada.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('GIF89a'),
    })

    await expect(
      page.getByText('Formato no permitido. Subí una foto en JPG, PNG o WebP'),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Guardar foto' }).click()
    await expect(
      page.getByText('Formato no permitido. Subí una foto en JPG, PNG o WebP'),
    ).toBeVisible()
    expect(api.requests.some((request) => PHOTO_URL.test(request.url()))).toBe(
      false,
    )
  })

  test('una foto de más de 5 MB se rechaza antes de subir', async ({
    page,
  }) => {
    const api = await routeOwnProfile(page, athlete)
    await seedSession(page, athlete, 'access-1')
    await page.goto(paths.profile)

    await page.getByLabel('Nueva foto').setInputFiles({
      name: 'grande.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    })

    await expect(
      page.getByText('La foto supera el tamaño máximo de 5 MB'),
    ).toBeVisible()
    expect(api.requests.some((request) => PHOTO_URL.test(request.url()))).toBe(
      false,
    )
  })

  test('cambia la contraseña: la actual incorrecta va al campo, la correcta confirma', async ({
    page,
  }) => {
    await routeOwnProfile(page, athlete)
    await seedSession(page, athlete, 'access-1')
    await page.goto(paths.profile)

    await page.getByLabel(/Contraseña actual/).fill('mal-tipeada')
    await page.getByLabel(/^Contraseña nueva/).fill('nueva-4567')
    await page.getByLabel(/Repetir contraseña nueva/).fill('nueva-4567')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()

    await expect(
      page.getByText('La contraseña actual no es correcta'),
    ).toBeVisible()
    await expect(page.getByLabel(/Contraseña actual/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByLabel(/Contraseña actual/).fill('vieja-123')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()

    await expect(page.getByRole('status')).toHaveText(
      'Cambiamos tu contraseña.',
    )
  })

  test('un email que ya usa otra cuenta (409) se marca en el campo email', async ({
    page,
  }) => {
    await routeOwnProfile(page, coach, {
      emailTaken: ['ana.otra@example.com'],
    })
    await seedSession(page, coach, 'access-1')
    await page.goto(paths.profile)

    await page.getByLabel(/Email/).fill('ana.otra@example.com')
    await page.getByRole('button', { name: 'Guardar datos' }).click()

    await expect(
      page.getByText('Ese email ya está en uso por otra cuenta'),
    ).toBeVisible()
    await expect(page.getByLabel(/Email/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('el entrenador llega a Mi perfil desde el menú de usuario', async ({
    page,
  }) => {
    await routeOwnProfile(page, coach)
    await seedSession(page, coach, 'access-1')
    await page.goto(paths.profile)

    await expect(
      page.getByRole('heading', { name: 'Mi perfil', level: 1 }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /Mi perfil/ })).toHaveAttribute(
      'href',
      paths.profile,
    )
    await expect(menuGroup(page)).toContainText('Ana Pérez')
  })

  test('en móvil la página no tiene scroll horizontal', async ({ page }) => {
    await routeOwnProfile(page, athlete)
    await page.setViewportSize({ width: 390, height: 844 })
    await seedSession(page, athlete, 'access-1')
    await page.goto(paths.profile)

    await expect(
      page.getByRole('heading', { name: 'Cambiar contraseña' }),
    ).toBeVisible()
    // como string: el tsconfig de E2E no tiene los tipos del DOM
    const overflow = await page.evaluate(
      'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
