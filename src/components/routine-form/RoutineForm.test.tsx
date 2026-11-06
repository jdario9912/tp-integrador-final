import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { ApiError } from '../../lib/api'
import { emptyRoutineFormValues } from './mappers'
import { RoutineForm } from './RoutineForm'
import type { RoutineFormValues } from './types'

const renderForm = ({
  onSubmit = vi.fn<(values: RoutineFormValues) => Promise<void>>(),
  onCancel = vi.fn<() => void>(),
}: {
  onSubmit?: Mock<(values: RoutineFormValues) => Promise<void>>
  onCancel?: Mock<() => void>
} = {}) => {
  render(
    <RoutineForm
      idPrefix="routine"
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Crear rutina"
    />,
  )
  return { onSubmit, onCancel }
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Crear rutina' }))

const nameInput = () => screen.getByLabelText(/Nombre/)

describe('RoutineForm', () => {
  it('arranca vacío y sin marcar como plantilla', () => {
    renderForm()

    expect(nameInput()).toHaveValue('')
    expect(screen.getByLabelText('Días por semana')).toHaveValue(null)
    expect(
      screen.getByRole('checkbox', { name: 'Guardar como plantilla' }),
    ).not.toBeChecked()
  })

  it('no envía sin nombre', async () => {
    const { onSubmit } = renderForm()

    await submit()

    expect(
      await screen.findByText('El nombre es obligatorio'),
    ).toBeInTheDocument()
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envía solo con el nombre: el resto es opcional', async () => {
    const { onSubmit } = renderForm()

    await userEvent.type(nameInput(), 'Fase de volumen')
    await submit()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      ...emptyRoutineFormValues,
      name: 'Fase de volumen',
    })
  })

  it('envía todos los valores cargados', async () => {
    const { onSubmit } = renderForm()

    await userEvent.type(nameInput(), 'Fuerza 5x5')
    await userEvent.type(screen.getByLabelText('Objetivo'), 'Fuerza máxima')
    await userEvent.type(screen.getByLabelText('Días por semana'), '3')
    await userEvent.type(screen.getByLabelText('Duración'), '12')
    await userEvent.type(screen.getByLabelText('Descripción'), 'Lineal')
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Guardar como plantilla' }),
    )
    await submit()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Fuerza 5x5',
      goal: 'Fuerza máxima',
      daysPerWeek: '3',
      durationWeeks: '12',
      description: 'Lineal',
      isTemplate: true,
    })
  })

  it.each([
    ['Días por semana', '8', 'Los días por semana deben estar entre 1 y 7'],
    ['Días por semana', '0', 'Los días por semana deben estar entre 1 y 7'],
    ['Duración', '53', 'La duración debe estar entre 1 y 52 semanas'],
    ['Duración', '2.5', 'La duración debe estar entre 1 y 52 semanas'],
  ])(
    'valida %s fuera de rango (%s) al salir del campo',
    async (label, value, message) => {
      const { onSubmit } = renderForm()

      await userEvent.type(screen.getByLabelText(label), value)
      await userEvent.tab()

      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(screen.getByLabelText(label)).toHaveAccessibleDescription(message)

      await userEvent.type(nameInput(), 'Rutina')
      await submit()
      expect(onSubmit).not.toHaveBeenCalled()
    },
  )

  it('la descripción y la plantilla tienen su texto de ayuda', () => {
    renderForm()

    expect(screen.getByLabelText('Descripción')).toHaveAccessibleDescription(
      'Opcional. Hasta 500 caracteres.',
    )
    expect(
      screen.getByRole('checkbox', { name: 'Guardar como plantilla' }),
    ).toHaveAccessibleDescription(
      'Una plantilla sirve de base para armar rutinas de distintos atletas.',
    )
  })

  it('un nombre repetido (409) se muestra en el campo y se limpia al editarlo', async () => {
    renderForm({
      onSubmit: vi
        .fn()
        .mockRejectedValue(
          new ApiError('Ya tiene una rutina llamada Fase de volumen', 409),
        ),
    })

    await userEvent.type(nameInput(), 'fase de volumen')
    await submit()

    expect(
      await screen.findByText('Ya tiene una rutina llamada Fase de volumen'),
    ).toBeInTheDocument()
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true')
    expect(nameInput()).toHaveAccessibleDescription(
      'Ya tiene una rutina llamada Fase de volumen',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.type(nameInput(), ' 2')
    expect(
      screen.queryByText('Ya tiene una rutina llamada Fase de volumen'),
    ).not.toBeInTheDocument()
  })

  it('muestra los errores por campo del backend', async () => {
    renderForm({
      onSubmit: vi.fn().mockRejectedValue(
        new ApiError('La solicitud tiene campos inválidos', 400, {
          fieldErrors: [
            {
              field: 'durationWeeks',
              message: 'La duración debe estar entre 1 y 52 semanas',
            },
          ],
        }),
      ),
    })

    await userEvent.type(nameInput(), 'Rutina')
    await submit()

    expect(
      await screen.findByText('La duración debe estar entre 1 y 52 semanas'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Duración')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('un error de un campo desconocido va al aviso general', async () => {
    renderForm({
      onSubmit: vi.fn().mockRejectedValue(
        new ApiError('La solicitud tiene campos inválidos', 400, {
          fieldErrors: [{ field: 'coachId', message: 'Inválido' }],
        }),
      ),
    })

    await userEvent.type(nameInput(), 'Rutina')
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La solicitud tiene campos inválidos',
    )
  })

  it('un 403 va al aviso general', async () => {
    renderForm({
      onSubmit: vi
        .fn()
        .mockRejectedValue(
          new ApiError('No tiene permisos para realizar esta acción', 403),
        ),
    })

    await userEvent.type(nameInput(), 'Rutina')
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tiene permisos para realizar esta acción',
    )
    expect(nameInput()).toHaveAttribute('aria-invalid', 'false')
  })

  it('muestra un mensaje genérico ante un error inesperado', async () => {
    renderForm({ onSubmit: vi.fn().mockRejectedValue(new Error('boom')) })

    await userEvent.type(nameInput(), 'Rutina')
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
