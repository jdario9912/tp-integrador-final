import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { ApiError } from '../../lib/api'
import { createdFood } from '../../test/food-fixtures'
import { FoodForm } from './FoodForm'
import { toFoodFormValues } from './mappers'
import type { FoodFormValues } from './types'

const renderForm = ({
  onSubmit = vi.fn<(values: FoodFormValues) => Promise<void>>(),
  onCancel = vi.fn<() => void>(),
  defaultValues,
}: {
  onSubmit?: Mock<(values: FoodFormValues) => Promise<void>>
  onCancel?: Mock<() => void>
  defaultValues?: FoodFormValues
} = {}) => {
  render(
    <FoodForm
      idPrefix="food"
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Crear alimento"
    />,
  )
  return { onSubmit, onCancel }
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Crear alimento' }))

const nameInput = () => screen.getByLabelText(/Nombre/)

describe('FoodForm', () => {
  it('no envía si faltan los obligatorios', async () => {
    const { onSubmit } = renderForm()

    await submit()

    for (const message of [
      'El nombre es obligatorio',
      'La porción de referencia es obligatoria',
      'Las calorías son obligatorias',
      'Las proteínas son obligatorias',
      'Los carbohidratos son obligatorios',
      'Las grasas son obligatorias',
    ]) {
      expect(await screen.findByText(message)).toBeInTheDocument()
    }
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('valida los rangos al salir del campo, con los mensajes del backend', async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText(/Porción de referencia/), '0')
    await userEvent.type(screen.getByLabelText(/Grasas/), '-1')
    await userEvent.tab()

    expect(
      await screen.findByText('La porción de referencia debe ser mayor a 0'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Las grasas no pueden ser negativas'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Grasas/)).toHaveAccessibleDescription(
      'Las grasas no pueden ser negativas',
    )
  })

  it('envía los valores cargados', async () => {
    const { onSubmit } = renderForm()

    await userEvent.type(nameInput(), 'Pechuga de pollo')
    await userEvent.type(screen.getByLabelText(/Porción de referencia/), '100')
    await userEvent.type(screen.getByLabelText(/Calorías/), '165')
    await userEvent.type(screen.getByLabelText(/Proteínas/), '31')
    await userEvent.type(screen.getByLabelText(/Carbohidratos/), '0')
    await userEvent.type(screen.getByLabelText(/Grasas/), '3.6')
    await submit()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Pechuga de pollo',
      referencePortionG: '100',
      caloriesKcal: '165',
      proteinG: '31',
      carbsG: '0',
      fatG: '3.6',
    })
  })

  it('precarga los valores de un alimento', () => {
    renderForm({ defaultValues: toFoodFormValues(createdFood()) })

    expect(nameInput()).toHaveValue('Manzana')
    expect(screen.getByLabelText(/Porción de referencia/)).toHaveValue(100)
    expect(screen.getByLabelText(/Proteínas/)).toHaveValue(0.3)
  })

  it('el 409 (nombre repetido) se muestra en el campo nombre', async () => {
    renderForm({
      defaultValues: toFoodFormValues(createdFood()),
      onSubmit: vi
        .fn()
        .mockRejectedValue(
          new ApiError(
            'Ya existe un alimento llamado Manzana en el catálogo',
            409,
          ),
        ),
    })

    await submit()

    expect(
      await screen.findByText(
        'Ya existe un alimento llamado Manzana en el catálogo',
      ),
    ).toBeInTheDocument()
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.type(nameInput(), ' verde')
    expect(
      screen.queryByText(
        'Ya existe un alimento llamado Manzana en el catálogo',
      ),
    ).not.toBeInTheDocument()
  })

  it('muestra cada error por campo del backend en su campo', async () => {
    renderForm({
      defaultValues: toFoodFormValues(createdFood()),
      onSubmit: vi.fn().mockRejectedValue(
        new ApiError('La solicitud tiene campos inválidos', 400, {
          fieldErrors: [
            {
              field: 'caloriesKcal',
              message: 'Las calorías admiten hasta 2 decimales',
            },
            { field: 'fatG', message: 'Las grasas no pueden superar 10000' },
          ],
        }),
      ),
    })

    await submit()

    expect(
      await screen.findByText('Las calorías admiten hasta 2 decimales'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Calorías/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(
      screen.getByText('Las grasas no pueden superar 10000'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('un error de un campo desconocido va al aviso general', async () => {
    renderForm({
      defaultValues: toFoodFormValues(createdFood()),
      onSubmit: vi.fn().mockRejectedValue(
        new ApiError('La solicitud tiene campos inválidos', 400, {
          fieldErrors: [{ field: 'id', message: 'Inválido' }],
        }),
      ),
    })

    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La solicitud tiene campos inválidos',
    )
  })

  it('el 403 va al aviso general', async () => {
    renderForm({
      defaultValues: toFoodFormValues(createdFood()),
      onSubmit: vi
        .fn()
        .mockRejectedValue(
          new ApiError('No tiene permisos para realizar esta acción', 403),
        ),
    })

    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tiene permisos para realizar esta acción',
    )
  })

  it('muestra un mensaje genérico ante un error inesperado', async () => {
    renderForm({
      defaultValues: toFoodFormValues(createdFood()),
      onSubmit: vi.fn().mockRejectedValue(new Error('boom')),
    })

    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado. Intentá nuevamente.',
    )
  })

  it('cancelar no envía', async () => {
    const { onSubmit, onCancel } = renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
