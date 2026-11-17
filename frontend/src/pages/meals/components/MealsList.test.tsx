import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { meal, mealItem } from '../../../test/meal-fixtures'
import { MealsList } from './MealsList'

const baseProps = {
  isPending: false,
  isRefreshing: false,
  error: null,
  onRetry: vi.fn(),
  editingId: null,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
}

describe('MealsList', () => {
  it('muestra el estado de carga mientras pide las comidas', () => {
    render(<MealsList {...baseProps} meals={undefined} isPending />)

    expect(
      screen.getByRole('status', { name: 'Cargando comidas' }),
    ).toBeInTheDocument()
  })

  it('sin comidas muestra el estado vacío', () => {
    render(<MealsList {...baseProps} meals={[]} />)

    expect(
      screen.getByText('Todavía no registraste comidas hoy'),
    ).toBeInTheDocument()
  })

  it('ante un error muestra el mensaje y Reintentar', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <MealsList
        {...baseProps}
        meals={undefined}
        error={new ApiError('Ocurrió un error inesperado', 500)}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText('Ocurrió un error inesperado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('muestra cada comida con sus calorías, y un guion si no tiene calorías', () => {
    const withItems = meal({ totalCaloriesKcal: 507.5 })
    const onlyText = meal({
      id: 'solo-texto',
      type: 'SNACK',
      description: 'Una banana',
      totalCaloriesKcal: null,
      items: [],
    })
    render(<MealsList {...baseProps} meals={[withItems, onlyText]} />)

    expect(
      screen.getByRole('list', { name: 'Comidas de hoy' }),
    ).toBeInTheDocument()
    expect(screen.getByText('507,5 kcal')).toBeInTheDocument()
    expect(
      screen.getByText('Pechuga de pollo cocida · 150 g · 247,5 kcal'),
    ).toBeInTheDocument()
    expect(screen.getByText('Una banana')).toBeInTheDocument()
    expect(screen.getByText('Sin calorías calculadas')).toBeInTheDocument()
  })

  it('editar y borrar avisan con la comida correspondiente', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const target = meal({ items: [mealItem()] })
    render(
      <MealsList
        {...baseProps}
        meals={[target]}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Editar Almuerzo: Pechuga de pollo cocida',
      }),
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Borrar Almuerzo: Pechuga de pollo cocida',
      }),
    )

    expect(onEdit).toHaveBeenCalledWith(target)
    expect(onDelete).toHaveBeenCalledWith(target)
  })

  it('marca la comida que está abierta en el formulario', () => {
    render(<MealsList {...baseProps} meals={[meal()]} editingId={meal().id} />)

    expect(screen.getByText('Editando')).toBeInTheDocument()
  })

  it('muestra si el entrenador revisó la comida y su comentario, solo lectura (US-25)', () => {
    const reviewed = meal({
      review: {
        reviewedAt: '2026-11-14T15:00:00Z',
        observation: 'Sumá verduras a la cena',
      },
    })
    const withoutComment = meal({
      id: 'sin-comentario',
      type: 'DINNER',
      review: { reviewedAt: '2026-11-14T15:00:00Z', observation: null },
    })
    const pending = meal({ id: 'pendiente', type: 'SNACK' })
    render(
      <MealsList {...baseProps} meals={[reviewed, withoutComment, pending]} />,
    )

    expect(screen.getAllByText(/Revisada por tu entrenador el/)).toHaveLength(2)
    expect(screen.getByText('Sumá verduras a la cena')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
