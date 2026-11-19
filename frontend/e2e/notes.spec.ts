import { expect, test, type Page } from '@playwright/test'
import { athleteProfilePath, paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// US-46: notas del entrenador sobre el atleta. La API se intercepta con un backend en memoria:
// el entrenador las escribe desde la ficha y el atleta ve las visibles en su panel
const NOTES_URL = /\/api\/athletes\/[^/]+\/notes(\?.*)?$/
const NOTE_READ_URL = /\/api\/athletes\/[^/]+\/notes\/[^/]+\/read$/
const ATHLETE_URL = /\/api\/athletes\/[^/?]+$/
const PAGED_URL =
  /\/api\/athletes\/[^/]+\/(weights|assignments|sessions|photos)(\?.*)?$/
const MEALS_OVERVIEW_URL = /\/api\/athletes\/[^/]+\/meals\/overview(\?.*)?$/
// panel del atleta: sus otras tarjetas, vacías
const ROUTINE_URL = /\/api\/athletes\/[^/]+\/routine(\?|$)/
const IN_PROGRESS_URL = /\/api\/athletes\/[^/]+\/sessions\/in-progress(\?|$)/
const MEALS_URL = /\/api\/athletes\/[^/]+\/meals(\/summary)?(\?|$)/

const ATHLETE_ID = athlete.id

type NoteJson = {
  id: string
  title: string
  content: string
  type: 'PRIVATE' | 'VISIBLE_TO_ATHLETE'
  createdAt: string
  readAt: string | null
}

const privateNote: NoteJson = {
  id: '11111111-0000-4000-8000-000000000001',
  title: 'Seguimiento',
  content: 'Le cuesta sostener la frecuencia los viernes.',
  type: 'PRIVATE',
  createdAt: '2026-11-12T15:00:00Z',
  readAt: null,
}
const visibleNote: NoteJson = {
  id: '11111111-0000-4000-8000-000000000002',
  title: 'Hidratación',
  content: 'Tomá al menos 2 litros de agua los días de entrenamiento.',
  type: 'VISIBLE_TO_ATHLETE',
  createdAt: '2026-11-14T13:30:00Z',
  readAt: null,
}

const emptyPage = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
}

// notas en memoria; el atleta solo recibe las visibles, como el backend
const routeNotes = async (
  page: Page,
  initial: NoteJson[],
  role: 'COACH' | 'ATHLETE',
) => {
  // copias: marcar como leída cambia la nota y no debe filtrarse a otros tests
  const notes = initial.map((note) => ({ ...note }))
  const created: unknown[] = []
  const reads: string[] = []
  await page.route(NOTES_URL, (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Omit<
        NoteJson,
        'id' | 'createdAt' | 'readAt'
      >
      created.push(body)
      const note: NoteJson = {
        ...body,
        id: `nueva-${created.length}`,
        createdAt: '2026-11-19T15:00:00Z',
        readAt: null,
      }
      notes.unshift(note)
      return route.fulfill({ status: 201, json: note })
    }
    const visible =
      role === 'ATHLETE'
        ? notes.filter((n) => n.type === 'VISIBLE_TO_ATHLETE')
        : notes
    return route.fulfill({ status: 200, json: visible })
  })
  await page.route(NOTE_READ_URL, (route) => {
    const noteId = route.request().url().split('/').at(-2) ?? ''
    reads.push(noteId)
    const note = notes.find(
      (n) => n.id === noteId && n.type === 'VISIBLE_TO_ATHLETE',
    )
    if (!note) {
      return route.fulfill(
        apiError(
          404,
          'La nota no existe',
          `/athletes/${ATHLETE_ID}/notes/${noteId}/read`,
        ),
      )
    }
    note.readAt ??= '2026-11-19T16:00:00Z'
    return route.fulfill({ status: 200, json: note })
  })
  return { created, reads }
}

const athleteJson = {
  id: ATHLETE_ID,
  coachId: coach.id,
  firstName: 'Leo',
  lastName: 'Gil',
  email: 'leo@example.com',
  phone: null,
  status: 'ACTIVE',
  active: true,
  sex: null,
  experienceLevel: null,
  birthDate: null,
  heightCm: null,
  initialWeightKg: null,
  goal: null,
  injuries: null,
  limitations: null,
  availableDays: null,
  startDate: null,
  createdAt: '2026-10-31T20:05:12.345678Z',
}

const routeProfile = async (page: Page) => {
  await page.route(PAGED_URL, (route) =>
    route.fulfill({ status: 200, json: emptyPage }),
  )
  await page.route(MEALS_OVERVIEW_URL, (route) => {
    const url = new URL(route.request().url())
    return route.fulfill({
      status: 200,
      json: {
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        totalDays: 7,
        daysWithMeals: 0,
        days: [],
      },
    })
  })
  await page.route(ATHLETE_URL, (route) =>
    route.fulfill({ status: 200, json: athleteJson }),
  )
}

const routeAthleteDashboard = async (page: Page) => {
  await page.route(PAGED_URL, (route) =>
    route.fulfill({ status: 200, json: emptyPage }),
  )
  await page.route(MEALS_URL, (route) =>
    route.request().url().includes('/summary')
      ? route.fulfill({
          status: 200,
          json: {
            date: '2026-11-19',
            mealCount: 0,
            caloriesKcal: 0,
            proteinG: 0,
            carbsG: 0,
            fatG: 0,
            mealsWithoutNutrition: 0,
          },
        })
      : route.fulfill({ status: 200, json: [] }),
  )
  await page.route(ROUTINE_URL, (route) => route.fulfill({ status: 204 }))
  await page.route(IN_PROGRESS_URL, (route) => route.fulfill({ status: 204 }))
}

const notesSection = (page: Page) =>
  page.getByRole('region', { name: 'Notas', exact: true })
const athleteNotesCard = (page: Page) =>
  page.getByRole('region', { name: 'Notas de tu entrenador' })

test.describe('como entrenador, en la ficha del atleta', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
    await routeProfile(page)
  })

  test('ve todas las notas con su tipo y si el atleta leyó las visibles', async ({
    page,
  }) => {
    await routeNotes(
      page,
      [{ ...visibleNote, readAt: '2026-11-15T12:00:00Z' }, privateNote],
      'COACH',
    )

    await page.goto(athleteProfilePath(ATHLETE_ID))

    const items = notesSection(page).getByRole('listitem')
    await expect(items).toHaveCount(2)
    await expect(items.nth(0)).toContainText('Visible para el atleta')
    await expect(items.nth(0)).toContainText('Leída el 15 de noviembre de 2026')
    await expect(items.nth(1)).toContainText('Privada')
    await expect(items.nth(1)).not.toContainText('Sin leer')
  })

  test('escribe una nota privada y otra visible', async ({ page }) => {
    const backend = await routeNotes(page, [], 'COACH')
    await page.goto(athleteProfilePath(ATHLETE_ID))
    const section = notesSection(page)
    await expect(section).toContainText(
      'Todavía no escribiste notas sobre este atleta',
    )

    await section.getByLabel(/Título/).fill('Seguimiento')
    await section
      .getByLabel(/Contenido/)
      .fill('Revisar la frecuencia de los viernes.')
    await section.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(section.getByRole('listitem')).toHaveCount(1)

    await section.getByLabel(/Título/).fill('Hidratación')
    await section.getByLabel(/Contenido/).fill('Tomá 2 litros de agua.')
    await section.getByText('Visible para el atleta', { exact: true }).click()
    await section.getByRole('button', { name: 'Guardar nota' }).click()

    await expect(section.getByRole('listitem')).toHaveCount(2)
    await expect(section.getByRole('listitem').first()).toContainText(
      'Sin leer',
    )
    expect(backend.created).toEqual([
      {
        title: 'Seguimiento',
        content: 'Revisar la frecuencia de los viernes.',
        type: 'PRIVATE',
      },
      {
        title: 'Hidratación',
        content: 'Tomá 2 litros de agua.',
        type: 'VISIBLE_TO_ATHLETE',
      },
    ])
  })

  test('no envía una nota vacía', async ({ page }) => {
    const backend = await routeNotes(page, [], 'COACH')
    await page.goto(athleteProfilePath(ATHLETE_ID))

    await notesSection(page)
      .getByRole('button', { name: 'Guardar nota' })
      .click()

    await expect(
      notesSection(page).getByText('El título es obligatorio'),
    ).toBeVisible()
    await expect(
      notesSection(page).getByText('El contenido es obligatorio'),
    ).toBeVisible()
    expect(backend.created).toHaveLength(0)
  })
})

test.describe('como atleta, en su panel', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
    await routeAthleteDashboard(page)
  })

  test('ve solo las notas visibles y marca una como leída', async ({
    page,
  }) => {
    const backend = await routeNotes(
      page,
      [visibleNote, privateNote],
      'ATHLETE',
    )

    await page.goto(paths.dashboard)

    const card = athleteNotesCard(page)
    await expect(card.getByRole('listitem')).toHaveCount(1)
    await expect(card).toContainText('Hidratación')
    await expect(card).not.toContainText('Seguimiento')
    await expect(card).toContainText('1 sin leer')

    await card
      .getByRole('button', { name: 'Marcar como leída: Hidratación' })
      .click()

    await expect(card).toContainText('Leída el 19 de noviembre de 2026')
    await expect(
      card.getByRole('button', { name: /Marcar como leída/ }),
    ).toHaveCount(0)
    expect(backend.reads).toEqual([visibleNote.id])
  })

  test('sin notas lo dice', async ({ page }) => {
    await routeNotes(page, [], 'ATHLETE')

    await page.goto(paths.dashboard)

    await expect(athleteNotesCard(page)).toContainText(
      'Tu entrenador todavía no te dejó notas',
    )
  })

  test('en un celular de 360 px la tarjeta cabe sin scroll horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await routeNotes(page, [visibleNote], 'ATHLETE')
    await page.goto(paths.dashboard)
    const button = athleteNotesCard(page).getByRole('button', {
      name: 'Marcar como leída: Hidratación',
    })
    await expect(button).toBeVisible()

    const scrollsSideways = await page.evaluate(
      'document.documentElement.scrollWidth > document.documentElement.clientWidth',
    )
    expect(scrollsSideways).toBe(false)
    expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
  })
})
