import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { putMealReview } from '../../../lib/meals/put-meal-review'
import { session } from '../../../test/auth-fixtures'
import { meal } from '../../../test/meal-fixtures'
import { MealReviewForm } from './MealReviewForm'

vi.mock('../../../lib/meals/put-meal-review', () => ({
  putMealReview: vi.fn(),
}))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'
const pending = meal()

const renderForm = (target = pending) => {
  const onSaved = vi.fn()
  const onCancel = vi.fn()
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <MealReviewForm
        athleteId={ATHLETE_ID}
        meal={target}
        onSaved={onSaved}
        onCancel={onCancel}
      />
    </QueryClientProvider>,
  )
  return { onSaved, onCancel }
}

beforeEach(() => {
  vi.mocked(putMealReview).mockReset()
  saveSession(session('COACH'))
})

describe('MealReviewForm (US-25)', () => {
  it('sin revisión, marca la comida como revisada con el comentario recortado', async () => {
    const user = userEvent.setup()
    vi.mocked(putMealReview).mockResolvedValue(pending)
    const { onSaved } = renderForm()

    await user.type(
      screen.getByLabelText('Comentario para el atleta'),
      '  Sumá verduras  ',
    )
    await user.click(
      screen.getByRole('button', { name: 'Marcar como revisada' }),
    )

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith('Marcaste la comida como revisada.'),
    )
    expect(putMealReview).toHaveBeenCalledWith(ATHLETE_ID, pending.id, {
      observation: 'Sumá verduras',
    })
  })

  it('sin texto se marca revisada sin comentario', async () => {
    const user = userEvent.setup()
    vi.mocked(putMealReview).mockResolvedValue(pending)
    renderForm()

    await user.click(
      screen.getByRole('button', { name: 'Marcar como revisada' }),
    )

    await waitFor(() =>
      expect(putMealReview).toHaveBeenCalledWith(ATHLETE_ID, pending.id, {
        observation: undefined,
      }),
    )
  })

  it('una revisión existente arranca con su comentario y lo reemplaza', async () => {
    const user = userEvent.setup()
    vi.mocked(putMealReview).mockResolvedValue(pending)
    const reviewed = meal({
      review: { reviewedAt: '2026-11-14T15:00:00Z', observation: 'Bien' },
    })
    const { onSaved } = renderForm(reviewed)

    const field = screen.getByLabelText('Comentario para el atleta')
    expect(field).toHaveValue('Bien')
    await user.clear(field)
    await user.type(field, 'Muy bien')
    await user.click(screen.getByRole('button', { name: 'Guardar revisión' }))

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        'Guardaste los cambios de la revisión.',
      ),
    )
    expect(putMealReview).toHaveBeenCalledWith(ATHLETE_ID, reviewed.id, {
      observation: 'Muy bien',
    })
  })

  it('el 400 del comentario se muestra en el campo', async () => {
    const user = userEvent.setup()
    vi.mocked(putMealReview).mockRejectedValue(
      new ApiError('Datos inválidos', 400, {
        fieldErrors: [
          {
            field: 'observation',
            message: 'El comentario no puede superar los 1000 caracteres',
          },
        ],
      }),
    )
    const { onSaved } = renderForm()

    await user.click(
      screen.getByRole('button', { name: 'Marcar como revisada' }),
    )

    expect(
      await screen.findByText(
        'El comentario no puede superar los 1000 caracteres',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Comentario para el atleta')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('un 403 o 404 se muestra como aviso general', async () => {
    const user = userEvent.setup()
    vi.mocked(putMealReview).mockRejectedValue(
      new ApiError('La comida no existe', 404),
    )
    renderForm()

    await user.click(
      screen.getByRole('button', { name: 'Marcar como revisada' }),
    )

    expect(await screen.findByText('La comida no existe')).toBeInTheDocument()
  })

  it('Cancelar cierra sin guardar', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(putMealReview).not.toHaveBeenCalled()
  })
})
