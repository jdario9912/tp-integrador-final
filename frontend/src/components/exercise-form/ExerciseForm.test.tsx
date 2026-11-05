import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { ApiError } from '../../lib/api'
import { createdExercise, muscleGroups } from '../../test/exercise-fixtures'
import { ExerciseForm } from './ExerciseForm'
import { toExerciseFormValues } from './mappers'
import type { ExerciseFormValues } from './types'

const renderForm = ({
  onSubmit = vi.fn<(values: ExerciseFormValues) => Promise<void>>(),
  onCancel = vi.fn<() => void>(),
  defaultValues,
}: {
  onSubmit?: Mock<(values: ExerciseFormValues) => Promise<void>>
  onCancel?: Mock<() => void>
  defaultValues?: ExerciseFormValues
} = {}) => {
  render(
    <ExerciseForm
      idPrefix="exercise"
      defaultValues={defaultValues}
      muscleGroups={muscleGroups}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Crear ejercicio"
    />,
  )
  return { onSubmit, onCancel }
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Crear ejercicio' }))

describe('ExerciseForm', () => {
  it('agrupa los grupos musculares por región', () => {
    renderForm()

    const select = screen.getByLabelText(/Grupo muscular/)
    const lower = within(select).getByRole('group', { name: 'Tren inferior' })
    expect(
      within(lower)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Pantorrillas'])
    expect(
      within(select).getByRole('group', { name: 'Cuerpo completo' }),
    ).toBeInTheDocument()
  })

  it('no envía si faltan los obligatorios', async () => {
    const { onSubmit } = renderForm()

    await submit()

    expect(
      await screen.findByText('El nombre es obligatorio'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('El grupo muscular es obligatorio'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('valida el link del video al salir del campo', async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText('Video'), 'youtube.com/abc')
    await userEvent.tab()

    expect(
      await screen.findByText(
        'Ingresá un link válido que empiece con http:// o https://',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Video')).toHaveAccessibleDescription(
      'Ingresá un link válido que empiece con http:// o https://',
    )
  })

  it('envía los valores cargados', async () => {
    const { onSubmit } = renderForm()

    await userEvent.type(screen.getByLabelText(/Nombre/), 'Hip thrust')
    await userEvent.selectOptions(
      screen.getByLabelText(/Grupo muscular/),
      'GLUTES',
    )
    await userEvent.type(screen.getByLabelText('Video'), 'https://youtu.be/abc')
    await userEvent.type(screen.getByLabelText('Descripción'), 'Con pausa')
    await submit()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Hip thrust',
      muscleGroup: 'GLUTES',
      videoUrl: 'https://youtu.be/abc',
      description: 'Con pausa',
    })
  })

  it('precarga los valores de un ejercicio', () => {
    renderForm({
      defaultValues: toExerciseFormValues(
        createdExercise({ description: 'Agarre medio' }),
      ),
    })

    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Press de banca')
    expect(screen.getByLabelText(/Grupo muscular/)).toHaveValue('CHEST')
    expect(screen.getByLabelText('Descripción')).toHaveValue('Agarre medio')
  })

  it('muestra los errores por campo del backend y los limpia al editar', async () => {
    renderForm({
      defaultValues: toExerciseFormValues(createdExercise()),
      onSubmit: vi.fn().mockRejectedValue(
        new ApiError('La solicitud tiene campos inválidos', 400, {
          fieldErrors: [{ field: 'videoUrl', message: 'URL inválida' }],
        }),
      ),
    })

    await submit()

    expect(await screen.findByText('URL inválida')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Video'), 'h')
    expect(screen.queryByText('URL inválida')).not.toBeInTheDocument()
  })

  it('un error sin campo (409) va al aviso general', async () => {
    renderForm({
      defaultValues: toExerciseFormValues(createdExercise()),
      onSubmit: vi
        .fn()
        .mockRejectedValue(
          new ApiError('Ya tenés un ejercicio llamado Press de banca', 409),
        ),
    })

    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya tenés un ejercicio llamado Press de banca',
    )
  })

  it('un error de un campo desconocido también va al aviso general', async () => {
    renderForm({
      defaultValues: toExerciseFormValues(createdExercise()),
      onSubmit: vi.fn().mockRejectedValue(
        new ApiError('La solicitud tiene campos inválidos', 400, {
          fieldErrors: [{ field: 'coachId', message: 'Inválido' }],
        }),
      ),
    })

    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La solicitud tiene campos inválidos',
    )
  })

  it('muestra un mensaje genérico ante un error inesperado', async () => {
    renderForm({
      defaultValues: toExerciseFormValues(createdExercise()),
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
