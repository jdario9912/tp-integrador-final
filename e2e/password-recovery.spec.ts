import { expect, test, type Page } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import { coach, SESSION_KEY, seedSession } from './auth-helpers.ts'
import { E2E_API_URL } from './config.ts'

// US-44: recuperación de contraseña (endpoints públicos). La API se intercepta
const RECOVERY_URL = `${E2E_API_URL}/auth/password-recovery`
const RESET_URL = `${E2E_API_URL}/auth/password-reset`

const errorJson = (
  status: number,
  message: string,
  path: string,
  fieldErrors?: { field: string; message: string }[],
) => ({
  status,
  json: {
    timestamp: '2026-11-19T18:00:00Z',
    status,
    error: status === 400 ? 'Bad Request' : 'Service Unavailable',
    message,
    path: `/api${path}`,
    ...(fieldErrors && { fieldErrors }),
  },
})

const fillNewPassword = async (page: Page, password: string) => {
  await page.getByLabel(/Nueva contraseña/).fill(password)
  await page.getByLabel(/Repetir contraseña/).fill(password)
}

test.describe('pedir el enlace', () => {
  test('desde el login pide el enlace y ve una confirmación neutra', async ({
    page,
  }) => {
    const bodies: unknown[] = []
    await page.route(RECOVERY_URL, (route) => {
      bodies.push(route.request().postDataJSON())
      return route.fulfill({ status: 202 })
    })

    await page.goto(paths.login)
    await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click()
    await expect(page).toHaveURL(paths.forgotPassword)

    await page.getByLabel(/Email/).fill('  ana@example.com ')
    await page.getByRole('button', { name: 'Enviar enlace' }).click()

    await expect(page.getByRole('status')).toContainText(
      'Si ana@example.com está registrado, te enviamos un enlace',
    )
    await expect(page.getByRole('status')).toContainText('Vence en 30 minutos.')
    expect(bodies).toEqual([{ email: 'ana@example.com' }])

    await page.getByRole('link', { name: /Volver a iniciar sesión/ }).click()
    await expect(page).toHaveURL(paths.login)
  })

  test('si no se pudo enviar el mail (503) lo avisa y deja reintentar', async ({
    page,
  }) => {
    await page.route(RECOVERY_URL, (route) =>
      route.fulfill(
        errorJson(
          503,
          'No pudimos enviar el email de recuperación. Intentá más tarde.',
          '/auth/password-recovery',
        ),
      ),
    )

    await page.goto(paths.forgotPassword)
    await page.getByLabel(/Email/).fill('ana@example.com')
    await page.getByRole('button', { name: 'Enviar enlace' }).click()

    await expect(page.getByRole('alert')).toContainText(
      'No pudimos enviar el email de recuperación.',
    )
    await expect(
      page.getByRole('button', { name: 'Enviar enlace' }),
    ).toBeEnabled()
  })
})

test.describe('crear la contraseña nueva', () => {
  test('con el link del mail cambia la contraseña, cierra la sesión guardada y vuelve al login', async ({
    page,
  }) => {
    // una sesión vieja en este navegador: el backend revoca todas al cambiar la contraseña
    await seedSession(page, coach, 'access-1')
    const requests: { body: unknown; authorization?: string }[] = []
    await page.route(RESET_URL, (route) => {
      requests.push({
        body: route.request().postDataJSON(),
        authorization: route.request().headers().authorization,
      })
      return route.fulfill({ status: 204 })
    })

    await page.goto(`${paths.resetPassword}?token=token-del-mail`)
    await fillNewPassword(page, 'nueva-clave-segura')
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()

    await expect(page).toHaveURL(paths.login)
    await expect(page.getByRole('status')).toContainText(
      'Actualizaste tu contraseña. Iniciá sesión con la nueva.',
    )
    expect(requests).toEqual([
      {
        body: { token: 'token-del-mail', newPassword: 'nueva-clave-segura' },
        authorization: undefined,
      },
    ])
    const stored = await page.evaluate(`localStorage.getItem('${SESSION_KEY}')`)
    expect(stored).toBeNull()
  })

  test('un token vencido o usado ofrece pedir un enlace nuevo', async ({
    page,
  }) => {
    await page.route(RESET_URL, (route) =>
      route.fulfill(
        errorJson(
          400,
          'El enlace de recuperación venció o ya fue usado',
          '/auth/password-reset',
        ),
      ),
    )

    await page.goto(`${paths.resetPassword}?token=viejo`)
    await fillNewPassword(page, 'nueva-clave-segura')
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()

    await expect(page.getByRole('alert')).toContainText(
      'El enlace de recuperación venció o ya fue usado',
    )
    await page
      .getByRole('button', { name: 'Solicitar un nuevo enlace' })
      .click()
    await expect(page).toHaveURL(paths.forgotPassword)
  })

  test('una contraseña que no cumple la política muestra el error en el campo', async ({
    page,
  }) => {
    await page.route(RESET_URL, (route) =>
      route.fulfill(
        errorJson(
          400,
          'La solicitud tiene campos inválidos',
          '/auth/password-reset',
          [
            {
              field: 'newPassword',
              message: 'La contraseña debe tener entre 8 y 72 bytes',
            },
          ],
        ),
      ),
    )

    await page.goto(`${paths.resetPassword}?token=token-del-mail`)
    await fillNewPassword(page, 'nueva-clave-segura')
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()

    await expect(
      page.getByText('La contraseña debe tener entre 8 y 72 bytes'),
    ).toBeVisible()
    await expect(page.getByLabel(/Nueva contraseña/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  test('sin token no muestra el formulario ni llama a la API', async ({
    page,
  }) => {
    let called = false
    await page.route(RESET_URL, (route) => {
      called = true
      return route.fulfill({ status: 204 })
    })

    await page.goto(paths.resetPassword)

    await expect(page.getByText(/El enlace no es válido/)).toBeVisible()
    await expect(page.getByLabel(/Nueva contraseña/)).toHaveCount(0)
    expect(called).toBe(false)
  })

  test('en un celular de 360 px cabe sin scroll horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(`${paths.resetPassword}?token=token-del-mail`)
    await expect(page.getByLabel(/Nueva contraseña/)).toBeVisible()

    const scrollsSideways = await page.evaluate(
      'document.documentElement.scrollWidth > document.documentElement.clientWidth',
    )
    expect(scrollsSideways).toBe(false)
    const box = await page
      .getByRole('button', { name: 'Guardar contraseña' })
      .boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  })
})
