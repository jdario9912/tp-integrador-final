import { expect, test, type Page } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import {
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'
import { E2E_API_URL } from './config.ts'

const ATHLETES_URL = `${E2E_API_URL}/athletes`

const createdAthlete = {
  id: '7d1f3c2a-5b6e-4f80-9a1b-2c3d4e5f6a7b',
  coachId: coach.id,
  firstName: 'Juana',
  lastName: 'Pérez',
  email: 'juana@example.com',
  phone: null,
  status: 'ACTIVE',
  active: true,
  sex: 'FEMALE',
  experienceLevel: 'BEGINNER',
  birthDate: null,
  heightCm: 165.5,
  initialWeightKg: 62,
  goal: 'Hipertrofia',
  injuries: null,
  limitations: null,
  availableDays: 3,
  startDate: null,
  createdAt: '2026-10-27T15:00:00Z',
}

const fillRequiredFields = async (page: Page) => {
  await page.getByLabel('Nombre').fill('Juana')
  await page.getByLabel('Apellido').fill('Pérez')
  await page.getByLabel('Email').fill('juana@example.com')
  await page.getByLabel('Contraseña').fill('12345678')
}

const submitButton = (page: Page) =>
  page.getByRole('button', { name: 'Guardar atleta' })

test.describe('como entrenador', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('crea un atleta desde el dashboard y vuelve con un aviso', async ({
    page,
  }) => {
    await page.route(ATHLETES_URL, (route) =>
      route.fulfill({ status: 201, json: createdAthlete }),
    )

    await page.goto(paths.dashboard)
    await page.getByRole('button', { name: 'Agregar atleta' }).click()
    await expect(page).toHaveURL(paths.newAthlete)

    await fillRequiredFields(page)
    await page.getByLabel('Sexo').selectOption('FEMALE')
    await page.getByLabel('Altura').fill('165.5')
    await page.getByLabel('Peso inicial').fill('62')
    await page.getByLabel('Objetivo').fill('Hipertrofia')
    await page.getByText('Principiante').click()
    await page.getByLabel('Días disponibles').fill('3')

    const requestPromise = page.waitForRequest(ATHLETES_URL)
    await submitButton(page).click()
    const request = await requestPromise

    expect(request.method()).toBe('POST')
    expect(request.headers().authorization).toBe('Bearer access-1')
    expect(request.postDataJSON()).toEqual({
      firstName: 'Juana',
      lastName: 'Pérez',
      email: 'juana@example.com',
      password: '12345678',
      sex: 'FEMALE',
      experienceLevel: 'BEGINNER',
      heightCm: 165.5,
      initialWeightKg: 62,
      goal: 'Hipertrofia',
      availableDays: 3,
    })
    await expect(page).toHaveURL(paths.dashboard)
    await expect(page.getByRole('status')).toHaveText(
      'Creaste a Juana Pérez. Ya puede ingresar con su email y la contraseña que le asignaste.',
    )

    // el aviso no vuelve a aparecer al recargar
    await page.reload()
    await expect(
      page.getByRole('heading', { name: '¡Bienvenido de nuevo, Ana!' }),
    ).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('no envía el formulario si faltan campos obligatorios', async ({
    page,
  }) => {
    let requested = false
    await page.route(ATHLETES_URL, (route) => {
      requested = true
      return route.abort()
    })

    await page.goto(paths.newAthlete)
    await submitButton(page).click()

    await expect(page.getByText('El nombre es obligatorio')).toBeVisible()
    await expect(page.getByText('El apellido es obligatorio')).toBeVisible()
    await expect(page.getByText('El email es obligatorio')).toBeVisible()
    await expect(page.getByText('La contraseña es obligatoria')).toBeVisible()
    expect(requested).toBe(false)
  })

  test('muestra los errores por campo que devuelve el backend', async ({
    page,
  }) => {
    await page.route(ATHLETES_URL, (route) =>
      route.fulfill({
        status: 400,
        json: {
          timestamp: '2026-10-27T15:00:00Z',
          status: 400,
          error: 'Bad Request',
          message: 'La solicitud tiene campos inválidos',
          path: '/api/athletes',
          fieldErrors: [
            { field: 'email', message: 'El email no tiene un formato válido' },
          ],
        },
      }),
    )

    await page.goto(paths.newAthlete)
    await fillRequiredFields(page)
    await submitButton(page).click()

    const emailInput = page.getByLabel('Email')
    await expect(
      page.getByText('El email no tiene un formato válido'),
    ).toBeVisible()
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')

    await emailInput.fill('otra@example.com')
    await expect(
      page.getByText('El email no tiene un formato válido'),
    ).toBeHidden()
  })

  test('muestra el mensaje del backend cuando el email ya existe', async ({
    page,
  }) => {
    await page.route(ATHLETES_URL, (route) =>
      route.fulfill({
        status: 409,
        json: {
          timestamp: '2026-10-27T15:00:00Z',
          status: 409,
          error: 'Conflict',
          message:
            'Ya existe un usuario registrado con el email juana@example.com',
          path: '/api/athletes',
        },
      }),
    )

    await page.goto(paths.newAthlete)
    await fillRequiredFields(page)
    await submitButton(page).click()

    await expect(page.getByRole('alert')).toHaveText(
      'Ya existe un usuario registrado con el email juana@example.com',
    )
    await expect(page).toHaveURL(paths.newAthlete)
  })
})

test('un atleta no puede entrar al alta de atletas', async ({ page }) => {
  await seedSession(page, athlete, 'access-1')
  await routeCurrentUser(page, athlete)

  await page.goto(paths.dashboard)
  await expect(page.getByText('Panel del atleta')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Agregar atleta' }),
  ).toHaveCount(0)

  await page.goto(paths.newAthlete)
  await expect(page).toHaveURL(paths.dashboard)
})
