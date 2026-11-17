import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import { createMeal } from '../../lib/meals/create-meal'
import { deleteMeal } from '../../lib/meals/delete-meal'
import { getMealsOfDay } from '../../lib/meals/get-meals'
import { updateMeal } from '../../lib/meals/update-meal'
import { session } from '../../test/auth-fixtures'
import { createdFood, foodsPage } from '../../test/food-fixtures'
import { meal, mealItem } from '../../test/meal-fixtures'
import {
  emptyDailySummary,
  dailySummary,
} from '../../test/daily-summary-fixtures'
import { MemoryRouter } from '../../lib/navigation'
import { getDailyNutritionSummary } from './actions/get-daily-summary'
import { searchFoods } from './actions/search-foods'
import { MealsPage } from './MealsPage'
import { shiftDay } from './day-navigation'
import { formatIsoDate, todayInAppTimeZone } from '../../lib/iso-date'

vi.mock('../../lib/meals/get-meals', () => ({ getMealsOfDay: vi.fn() }))
vi.mock('../../lib/meals/create-meal', () => ({ createMeal: vi.fn() }))
vi.mock('../../lib/meals/update-meal', () => ({ updateMeal: vi.fn() }))
vi.mock('../../lib/meals/delete-meal', () => ({ deleteMeal: vi.fn() }))
vi.mock('./actions/search-foods', () => ({ searchFoods: vi.fn() }))
// US-24: resumen del día
vi.mock('./actions/get-daily-summary', () => ({
  getDailyNutritionSummary: vi.fn(),
}))

const athlete = session('ATHLETE')
const ATHLETE_ID = athlete.user.id
const arroz = createdFood({ id: 'f-arroz', name: 'Arroz blanco cocido' })

// "hoy" de la zona de la app y el día anterior: los tests no dependen de la fecha real
const TODAY = todayInAppTimeZone()
const YESTERDAY = shiftDay(TODAY, -1)

// path: la URL con la que se abre la página (?date= para un día anterior)
const renderPage = (path = '/meals') => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <MealsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(getMealsOfDay).mockReset()
  vi.mocked(createMeal).mockReset()
  vi.mocked(updateMeal).mockReset()
  vi.mocked(deleteMeal).mockReset()
  vi.mocked(searchFoods).mockReset()
  vi.mocked(searchFoods).mockResolvedValue(foodsPage([arroz]))
  // por defecto, el resumen de cada día pedido (vacío): cada test ajusta el suyo
  vi.mocked(getDailyNutritionSummary).mockReset()
  vi.mocked(getDailyNutritionSummary).mockImplementation(async (_, date) =>
    emptyDailySummary(date),
  )
  saveSession(athlete)
})

describe('MealsPage · listado del día', () => {
  it('pide las comidas de hoy en la zona de la app', async () => {
    vi.mocked(getMealsOfDay).mockResolvedValue([])

    renderPage()

    expect(
      await screen.findByText('Todavía no registraste comidas hoy'),
    ).toBeInTheDocument()
    expect(getMealsOfDay).toHaveBeenCalledWith(ATHLETE_ID, todayInAppTimeZone())
  })

  it('ante un error muestra Reintentar y lo vuelve a pedir', async () => {
    const user = userEvent.setup()
    vi.mocked(getMealsOfDay)
      .mockRejectedValueOnce(new ApiError('Ocurrió un error inesperado', 500))
      .mockResolvedValueOnce([meal()])

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByRole('list', { name: 'Comidas de hoy' }),
    ).toBeInTheDocument()
  })
})

describe('MealsPage · alta', () => {
  it('registra una comida de hoy y la ve en la lista', async () => {
    const user = userEvent.setup()
    const registered = meal({
      id: 'nueva',
      type: 'DINNER',
      description: 'Sopa',
      totalCaloriesKcal: null,
      items: [],
    })
    vi.mocked(getMealsOfDay)
      .mockResolvedValueOnce([])
      .mockResolvedValue([registered])
    vi.mocked(createMeal).mockResolvedValue(registered)

    renderPage()
    await screen.findByText('Todavía no registraste comidas hoy')

    await user.click(screen.getByRole('radio', { name: 'Cena' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Descripción' }),
      'Sopa',
    )
    await user.click(screen.getByRole('button', { name: 'Registrar comida' }))

    expect(
      await screen.findByText('Registraste cena de hoy.'),
    ).toBeInTheDocument()
    expect(createMeal).toHaveBeenCalledWith(ATHLETE_ID, {
      date: todayInAppTimeZone(),
      type: 'DINNER',
      description: 'Sopa',
      items: [],
    })
    expect(
      await screen.findByRole('button', { name: /Editar Cena: Sopa/ }),
    ).toBeInTheDocument()
  })
})

describe('MealsPage · edición', () => {
  it('abre la comida en el formulario y la guarda con su fecha', async () => {
    const user = userEvent.setup()
    const original = meal({ items: [mealItem()] })
    vi.mocked(getMealsOfDay).mockResolvedValue([original])
    vi.mocked(updateMeal).mockResolvedValue(original)

    renderPage()
    await user.click(
      await screen.findByRole('button', {
        name: /Editar Almuerzo: Pechuga/,
      }),
    )

    expect(screen.getByRole('heading', { name: 'Editar comida' })).toHaveFocus()
    expect(screen.getByText(/Del 13 de noviembre de 2026/)).toBeInTheDocument()
    await user.type(
      screen.getByRole('textbox', { name: 'Descripción' }),
      'Con ensalada',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(updateMeal).toHaveBeenCalledTimes(1))
    expect(updateMeal).toHaveBeenCalledWith(ATHLETE_ID, original.id, {
      date: '2026-11-13',
      type: 'LUNCH',
      description: 'Con ensalada',
      items: [
        { foodId: '0b1c2d3e-4f5a-4b6c-9d7e-8f9a0b1c2d3e', quantityG: 150 },
      ],
    })
    expect(
      await screen.findByText('Guardaste los cambios de almuerzo.'),
    ).toBeInTheDocument()
  })

  it('si la comida ya no existe, vuelve al alta y avisa', async () => {
    const user = userEvent.setup()
    const original = meal()
    vi.mocked(getMealsOfDay).mockResolvedValue([original])
    vi.mocked(updateMeal).mockRejectedValue(
      new ApiError('No existe la comida con id x', 404),
    )

    renderPage()
    await user.click(
      await screen.findByRole('button', { name: /Editar Almuerzo/ }),
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Descripción' }),
      'Algo',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText(
        'Esa comida ya no existe. Actualizamos la lista.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Registrar comida' }),
    ).toBeInTheDocument()
  })
})

// US-24: navegación por días, resumen diario y alta en el día que se mira
describe('MealsPage · día y resumen (US-24)', () => {
  it('pide las comidas y el resumen del día que indica la URL', async () => {
    vi.mocked(getMealsOfDay).mockResolvedValue([])

    renderPage(`/meals?date=${YESTERDAY}`)

    expect(
      await screen.findByRole('heading', { name: 'Comidas del día', level: 2 }),
    ).toBeInTheDocument()
    expect(getMealsOfDay).toHaveBeenCalledWith(ATHLETE_ID, YESTERDAY)
    expect(getDailyNutritionSummary).toHaveBeenCalledWith(ATHLETE_ID, YESTERDAY)
  })

  it('una fecha inválida o futura en la URL muestra hoy', async () => {
    vi.mocked(getMealsOfDay).mockResolvedValue([])

    renderPage('/meals?date=2026-02-31')

    expect(
      await screen.findByRole('heading', { name: 'Comidas de hoy', level: 2 }),
    ).toBeInTheDocument()
    expect(getMealsOfDay).toHaveBeenCalledWith(ATHLETE_ID, TODAY)
    expect(getMealsOfDay).not.toHaveBeenCalledWith(ATHLETE_ID, '2026-02-31')
  })

  it('el día anterior cambia la lista y el resumen, y el alta va a ese día', async () => {
    const user = userEvent.setup()
    vi.mocked(getMealsOfDay).mockResolvedValue([])
    vi.mocked(createMeal).mockResolvedValue(meal({ date: YESTERDAY }))

    renderPage()
    await screen.findByText('Todavía no registraste comidas hoy')

    await user.click(screen.getByRole('button', { name: 'Día anterior' }))

    expect(
      await screen.findByText('No registraste comidas ese día'),
    ).toBeInTheDocument()
    expect(getMealsOfDay).toHaveBeenLastCalledWith(ATHLETE_ID, YESTERDAY)
    expect(getDailyNutritionSummary).toHaveBeenLastCalledWith(
      ATHLETE_ID,
      YESTERDAY,
    )
    expect(
      screen.getByRole('heading', { name: 'Comidas del día' }),
    ).toHaveFocus()

    await user.click(screen.getByRole('radio', { name: 'Cena' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Descripción' }),
      'Sopa',
    )
    await user.click(screen.getByRole('button', { name: 'Registrar comida' }))

    expect(
      await screen.findByText(
        `Registraste cena del ${formatIsoDate(YESTERDAY)}.`,
      ),
    ).toBeInTheDocument()
    expect(createMeal).toHaveBeenCalledWith(ATHLETE_ID, {
      date: YESTERDAY,
      type: 'DINNER',
      description: 'Sopa',
      items: [],
    })
  })

  it('no permite ir al día siguiente de hoy', async () => {
    renderPage()

    expect(
      await screen.findByRole('button', { name: 'Día siguiente' }),
    ).toBeDisabled()
  })

  it('muestra el resumen del día y avisa de las comidas sin datos nutricionales', async () => {
    vi.mocked(getMealsOfDay).mockResolvedValue([meal()])
    vi.mocked(getDailyNutritionSummary).mockResolvedValue(
      dailySummary({ date: TODAY, mealsWithoutNutrition: 1 }),
    )

    renderPage()

    expect(await screen.findByText('507,5 kcal')).toBeInTheDocument()
    expect(
      screen.getByText(
        '1 comida sin datos nutricionales no se cuenta en el total.',
      ),
    ).toBeInTheDocument()
  })

  it('una edición se cancela al cambiar de día', async () => {
    const user = userEvent.setup()
    const original = meal()
    vi.mocked(getMealsOfDay).mockResolvedValue([original])

    renderPage()
    await user.click(
      await screen.findByRole('button', { name: /Editar Almuerzo/ }),
    )
    expect(
      screen.getByRole('heading', { name: 'Editar comida' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Día anterior' }))

    expect(
      await screen.findByRole('heading', { name: 'Registrar comida' }),
    ).toBeInTheDocument()
  })
})

describe('MealsPage · borrado', () => {
  it('pide confirmación y después borra la comida', async () => {
    const user = userEvent.setup()
    const target = meal()
    vi.mocked(getMealsOfDay)
      .mockResolvedValueOnce([target])
      .mockResolvedValue([])
    vi.mocked(deleteMeal).mockResolvedValue(undefined)

    renderPage()
    await user.click(
      await screen.findByRole('button', { name: /Borrar Almuerzo/ }),
    )

    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('heading', {
        name: '¿Borrar la comida de almuerzo?',
      }),
    ).toBeInTheDocument()
    expect(deleteMeal).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Borrar' }))

    await waitFor(() =>
      expect(deleteMeal).toHaveBeenCalledWith(ATHLETE_ID, target.id),
    )
    expect(
      await screen.findByText('Borraste almuerzo de hoy.'),
    ).toBeInTheDocument()
  })

  it('si la comida ya no existe al borrarla, refresca la lista y avisa', async () => {
    const user = userEvent.setup()
    vi.mocked(getMealsOfDay).mockResolvedValue([meal()])
    vi.mocked(deleteMeal).mockRejectedValue(
      new ApiError('No existe la comida', 404),
    )

    renderPage()
    await user.click(
      await screen.findByRole('button', { name: /Borrar Almuerzo/ }),
    )
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Borrar',
      }),
    )

    expect(
      await screen.findByText(
        'Esa comida ya no estaba registrada. Actualizamos la lista.',
      ),
    ).toBeInTheDocument()
  })
})
