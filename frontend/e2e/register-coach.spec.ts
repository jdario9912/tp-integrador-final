import { expect, test, type Page } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import { E2E_API_URL } from './config.ts'

const COACHES_URL = `${E2E_API_URL}/coaches`
const LOGIN_URL = `${E2E_API_URL}/auth/login`
const ME_URL = `${E2E_API_URL}/auth/me`

const createdCoach = {
  id: 'f14b8801-422f-4411-bdf4-e7a4f3ac3c4c',
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@example.com',
  phone: null,
  specialty: 'Running',
  licenseNumber: null,
  bio: null,
  createdAt: '2026-10-21T17:16:57.149937Z',
}

const fillRequiredFields = async (page: Page) => {
  await page.getByLabel('Nombre').fill('Ana')
  await page.getByLabel('Apellido').fill('Pérez')
  await page.getByLabel('Email').fill('ana@example.com')
  await page.getByLabel('Contraseña').fill('12345678')
}

const submitButton = (page: Page) =>
  page.getByRole('button', { name: 'Registrarme' })

// después de registrarse el front inicia sesión solo con las mismas credenciales
const loggedCoach = {
  id: createdCoach.id,
  firstName: createdCoach.firstName,
  lastName: createdCoach.lastName,
  email: createdCoach.email,
  role: 'COACH',
}

test.beforeEach(async ({ page }) => {
  await page.route(LOGIN_URL, (route) =>
    route.fulfill({
      status: 200,
      json: {
        accessToken: 'access-1',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshToken: 'refresh-1',
        refreshExpiresIn: 7200,
        role: 'COACH',
        user: loggedCoach,
      },
    }),
  )
  await page.route(ME_URL, (route) =>
    route.fulfill({ status: 200, json: loggedCoach }),
  )
  await page.goto(paths.registerCoach)
})

test('registra un entrenador con los datos ingresados', async ({ page }) => {
  await page.route(COACHES_URL, (route) =>
    route.fulfill({
      status: 201,
      json: createdCoach,
    }),
  )

  await fillRequiredFields(page)
  await page.getByLabel('Especialidad').fill('Running')

  const requestPromise = page.waitForRequest(COACHES_URL)
  await submitButton(page).click()
  const request = await requestPromise

  expect(request.method()).toBe('POST')
  expect(request.postDataJSON()).toEqual({
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@example.com',
    password: '12345678',
    specialty: 'Running',
  })
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('después de registrarse inicia sesión y entra al dashboard', async ({
  page,
}) => {
  await page.route(COACHES_URL, (route) =>
    route.fulfill({ status: 201, json: createdCoach }),
  )

  await fillRequiredFields(page)
  const loginPromise = page.waitForRequest(LOGIN_URL)
  await submitButton(page).click()
  const login = await loginPromise

  expect(login.postDataJSON()).toEqual({
    email: 'ana@example.com',
    password: '12345678',
  })
  await expect(page).toHaveURL(paths.dashboard)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Panel del entrenador')).toBeVisible()
})

test('no envía el formulario si faltan campos obligatorios', async ({
  page,
}) => {
  let requested = false
  await page.route(COACHES_URL, (route) => {
    requested = true
    return route.abort()
  })

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
  await page.route(COACHES_URL, (route) =>
    route.fulfill({
      status: 400,
      json: {
        timestamp: '2026-10-21T18:43:35.107718179Z',
        status: 400,
        error: 'Bad Request',
        message: 'La solicitud tiene campos inválidos',
        path: '/api/coaches',
        fieldErrors: [{ field: 'email', message: 'El email ya está en uso' }],
      },
    }),
  )

  await fillRequiredFields(page)
  await submitButton(page).click()

  const emailInput = page.getByLabel('Email')
  await expect(page.getByText('El email ya está en uso')).toBeVisible()
  await expect(emailInput).toHaveAttribute('aria-invalid', 'true')

  await emailInput.fill('otra@example.com')
  await expect(page.getByText('El email ya está en uso')).toBeHidden()
})

test('muestra el mensaje del backend cuando el email ya existe', async ({
  page,
}) => {
  await page.route(COACHES_URL, (route) =>
    route.fulfill({
      status: 409,
      json: {
        timestamp: '2026-10-21T17:15:34.404823729Z',
        status: 409,
        error: 'Conflict',
        message: 'Ya existe un usuario registrado con el email ana@example.com',
        path: '/api/coaches',
      },
    }),
  )

  await fillRequiredFields(page)
  await submitButton(page).click()

  await expect(page.getByRole('alert')).toHaveText(
    'Ya existe un usuario registrado con el email ana@example.com',
  )
})
