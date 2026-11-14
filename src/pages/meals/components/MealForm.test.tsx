import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { session } from '../../../test/auth-fixtures'
import { createdFood, foodsPage } from '../../../test/food-fixtures'
import { searchFoods } from '../actions/search-foods'
import { emptyMealFormValues } from '../meal-form-values'
import type { MealFormValues } from '../types'
import { MealForm } from './MealForm'

vi.mock('../actions/search-foods', () => ({ searchFoods: vi.fn() }))

const arroz = createdFood({
  id: 'f-arroz',
  name: 'Arroz blanco cocido',
  referencePortionG: 100,
  caloriesKcal: 130,
})
const pollo = createdFood({ id: 'f-pollo', name: 'Pechuga de pollo cocida' })

const renderForm = (
  onSubmit: (values: MealFormValues) => Promise<void>,
  overrides: { defaultValues?: MealFormValues; onCancel?: () => void } = {},
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MealForm
        defaultValues={overrides.defaultValues ?? emptyMealFormValues('LUNCH')}
        onSubmit={onSubmit}
        submitLabel="Registrar comida"
        onCancel={overrides.onCancel}
      />
    </QueryClientProvider>,
  )
}

const searchBox = () =>
  screen.getByRole('searchbox', { name: 'Buscar alimento' })

// busca y agrega un alimento del catálogo, como lo haría el atleta
const addFood = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) => {
  await user.type(searchBox(), name)
  await user.click(
    await screen.findByRole('button', { name: `Agregar ${name}` }),
  )
}

beforeEach(() => {
  vi.mocked(searchFoods).mockReset()
  vi.mocked(searchFoods).mockResolvedValue(foodsPage([arroz, pollo]))
  saveSession(session('ATHLETE'))
})

describe('MealForm · tipo de comida', () => {
  it('muestra el tipo sugerido y se puede cambiar con un toque', async () => {
    const user = userEvent.setup()
    renderForm(vi.fn())

    expect(screen.getByRole('radio', { name: 'Almuerzo' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Cena' }))
    expect(screen.getByRole('radio', { name: 'Cena' })).toBeChecked()
  })
})

describe('MealForm · envío y validaciones', () => {
  it('pide una descripción o al menos un alimento y no envía', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm(onSubmit)

    await user.click(screen.getByRole('button', { name: 'Registrar comida' }))

    expect(
      await screen.findByText('Cargá una descripción o al menos un alimento'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(searchBox()).toHaveFocus()
  })

  it('agrega un alimento con su porción de referencia y envía la cantidad corregida', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm(onSubmit)

    await addFood(user, 'Arroz blanco cocido')
    const quantity = screen.getByRole('spinbutton', {
      name: /Cantidad de Arroz blanco cocido/,
    })
    expect(quantity).toHaveValue(100)
    await user.clear(quantity)
    await user.type(quantity, '150')
    await user.type(
      screen.getByRole('textbox', { name: 'Descripción' }),
      '  Con limón  ',
    )
    await user.click(screen.getByRole('button', { name: 'Registrar comida' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      type: 'LUNCH',
      description: '  Con limón  ',
      items: [
        expect.objectContaining({
          foodId: 'f-arroz',
          foodName: 'Arroz blanco cocido',
          quantityG: '150',
        }),
      ],
    })
  })

  it('la cantidad se valida al salir del campo', async () => {
    const user = userEvent.setup()
    renderForm(vi.fn())
    await addFood(user, 'Arroz blanco cocido')

    const quantity = screen.getByRole('spinbutton', {
      name: /Cantidad de Arroz blanco cocido/,
    })
    await user.clear(quantity)
    await user.type(quantity, '0')
    await user.tab()

    expect(
      await screen.findByText('La cantidad debe ser mayor a 0 g'),
    ).toBeInTheDocument()
    expect(quantity).toHaveAttribute('aria-invalid', 'true')
  })

  it('quitar un alimento lo saca de la comida', async () => {
    const user = userEvent.setup()
    renderForm(vi.fn())
    await addFood(user, 'Arroz blanco cocido')

    const list = screen.getByRole('list', { name: 'Alimentos de la comida' })
    await user.click(
      within(list).getByRole('button', { name: 'Quitar Arroz blanco cocido' }),
    )

    expect(
      screen.queryByRole('list', { name: 'Alimentos de la comida' }),
    ).not.toBeInTheDocument()
  })

  it('Enter en el buscador agrega el primer resultado y no envía la comida', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm(onSubmit)

    await user.type(searchBox(), 'arr')
    // la lista del catálogo ya trae el arroz: se espera a que termine la búsqueda con el texto escrito
    await waitFor(() =>
      expect(
        screen.getByRole('list', { name: 'Alimentos encontrados' }),
      ).toHaveAttribute('aria-busy', 'false'),
    )
    await user.keyboard('{Enter}')

    expect(
      await screen.findByRole('spinbutton', {
        name: /Cantidad de Arroz blanco cocido/,
      }),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('MealForm · errores del servidor', () => {
  it('un 400 de cantidad va al campo de ese alimento', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError('La solicitud tiene campos inválidos', 400, {
        fieldErrors: [
          {
            field: 'items[0].quantityG',
            message: 'La cantidad debe ser mayor a 0 g',
          },
        ],
      }),
    )
    renderForm(onSubmit)
    await addFood(user, 'Arroz blanco cocido')
    await user.type(
      screen.getByRole('textbox', { name: 'Descripción' }),
      'Almuerzo',
    )

    await user.click(screen.getByRole('button', { name: 'Registrar comida' }))

    expect(
      await screen.findByText('La cantidad debe ser mayor a 0 g'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('alert', { name: /campos inválidos/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('La solicitud tiene campos inválidos'),
    ).not.toBeInTheDocument()
  })

  it('un 404 de alimento (sin campo) se muestra como aviso general', async () => {
    const user = userEvent.setup()
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError('No existe el alimento con id f-arroz', 404),
      )
    renderForm(onSubmit)
    await addFood(user, 'Arroz blanco cocido')

    await user.click(screen.getByRole('button', { name: 'Registrar comida' }))

    expect(
      await screen.findByText('No existe el alimento con id f-arroz'),
    ).toBeInTheDocument()
  })

  it('en la edición, Cancelar vuelve al alta', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderForm(vi.fn(), { onCancel })

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
