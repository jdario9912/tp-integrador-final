import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { ApiError } from '../../lib/api'
import { muscleGroups } from '../../test/exercise-fixtures'
import {
  routineDay,
  routineDetail,
  routineExercise,
} from '../../test/routine-fixtures'
import { newDayFormValues, toStructureFormValues } from './mappers'
import {
  RoutineStructureForm,
  type ExercisePickerProps,
} from './RoutineStructureForm'
import type { RoutineStructureFormValues } from './types'

// buscador falso: el real (con la API del catálogo) lo prueba la página
function PickerStub({ onPick, onClose }: ExercisePickerProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          onPick({ id: 'x-remo', name: 'Remo', muscleGroup: 'BACK' })
        }
      >
        elegir Remo
      </button>
      <button type="button" onClick={onClose}>
        cerrar buscador
      </button>
    </div>
  )
}

const saved = routineDetail({
  days: [
    routineDay({
      exercises: [
        routineExercise({ recommendedWeight: 80, rest: 90 }),
        routineExercise({
          id: 'e2',
          exerciseId: 'x-fondos',
          exerciseName: 'Fondos',
          muscleGroup: 'TRICEPS',
          sets: 3,
          reps: 12,
        }),
      ],
    }),
    routineDay({ id: 'd2', dayNumber: 2, name: 'Tirón' }),
  ],
})

type SubmitMock = Mock<(values: RoutineStructureFormValues) => Promise<void>>

const renderForm = ({
  defaultValues = toStructureFormValues(saved),
  onSubmit = vi.fn<(values: RoutineStructureFormValues) => Promise<void>>(),
  onCancel = vi.fn<() => void>(),
  renderErrorAction,
}: {
  defaultValues?: RoutineStructureFormValues
  onSubmit?: SubmitMock
  onCancel?: Mock<() => void>
  renderErrorAction?: (error: ApiError) => React.ReactNode
} = {}) => {
  render(
    <RoutineStructureForm
      idPrefix="structure"
      defaultValues={defaultValues}
      muscleGroups={muscleGroups}
      onSubmit={onSubmit}
      onCancel={onCancel}
      renderExercisePicker={(props) => <PickerStub {...props} />}
      renderErrorAction={renderErrorAction}
    />,
  )
  return { onSubmit, onCancel }
}

const day = (number: number) =>
  screen.getByRole('region', { name: `Día ${number}` })

const exercise = (name: string) => screen.getByRole('listitem', { name })

const exerciseNames = (dayNumber: number) =>
  within(day(dayNumber))
    .queryAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent)

const dayNames = () =>
  screen
    .getAllByLabelText(/Nombre del día/)
    .map((input) => (input as HTMLInputElement).value)

const save = () =>
  userEvent.click(screen.getByRole('button', { name: 'Guardar estructura' }))

describe('RoutineStructureForm', () => {
  it('muestra los días y ejercicios guardados con sus valores', () => {
    renderForm()

    expect(dayNames()).toEqual(['Empuje', 'Tirón'])
    expect(within(day(1)).getByText('2 ejercicios')).toBeInTheDocument()
    expect(within(day(2)).getByText('0 ejercicios')).toBeInTheDocument()
    expect(exerciseNames(1)).toEqual(['Press de banca', 'Fondos'])

    const press = exercise('Press de banca')
    expect(within(press).getByText('Pecho')).toBeInTheDocument()
    expect(within(press).getByLabelText(/Series/)).toHaveValue(4)
    expect(within(press).getByLabelText(/Repeticiones/)).toHaveValue(10)
    expect(within(press).getByLabelText('Peso')).toHaveValue(80)
    expect(within(press).getByLabelText('Descanso')).toHaveValue(90)
  })

  it('sin días muestra el estado vacío', () => {
    renderForm({ defaultValues: { days: [] } })

    expect(
      screen.getByText('La rutina todavía no tiene días'),
    ).toBeInTheDocument()
  })

  it('agrega un día con nombre por defecto y el foco en el nombre', async () => {
    renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Agregar día' }))

    const name = within(day(3)).getByLabelText(/Nombre del día/)
    expect(name).toHaveValue('Día 3')
    await waitFor(() => expect(name).toHaveFocus())
    // el texto queda seleccionado: se reemplaza escribiendo
    await userEvent.keyboard('Piernas')
    expect(name).toHaveValue('Piernas')
  })

  it('no permite más de 7 días', () => {
    renderForm({
      defaultValues: {
        days: Array.from({ length: 7 }, (_, index) =>
          newDayFormValues(index + 1),
        ),
      },
    })

    expect(screen.getByRole('button', { name: 'Agregar día' })).toBeDisabled()
    expect(
      screen.getByText('Una rutina admite hasta 7 días.'),
    ).toBeInTheDocument()
  })

  it('agrega ejercicios del catálogo y valida series y repeticiones', async () => {
    const { onSubmit } = renderForm()

    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar ejercicio al día 2' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'elegir Remo' }))
    expect(exerciseNames(2)).toEqual(['Remo'])
    expect(within(exercise('Remo')).getByText('Espalda')).toBeInTheDocument()

    await save()

    expect(
      await within(exercise('Remo')).findByText('Las series son obligatorias'),
    ).toBeInTheDocument()
    expect(
      within(exercise('Remo')).getByText('Las repeticiones son obligatorias'),
    ).toBeInTheDocument()
    expect(within(exercise('Remo')).getByLabelText(/Series/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Revisá los campos marcados.',
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('valida al salir de cada campo', async () => {
    renderForm()
    const press = exercise('Press de banca')

    await userEvent.clear(within(press).getByLabelText(/Series/))
    await userEvent.type(within(press).getByLabelText(/Series/), '100')
    await userEvent.type(within(press).getByLabelText('RIR/RPE'), 'RIR 11')
    await userEvent.tab()

    expect(
      within(press).getByText('Las series deben estar entre 1 y 99'),
    ).toBeInTheDocument()
    expect(within(press).getByLabelText('RIR/RPE')).toHaveAccessibleDescription(
      'Usá el formato RIR n (0 a 10) o RPE n (1 a 10)',
    )

    await userEvent.clear(within(day(2)).getByLabelText(/Nombre del día/))
    await userEvent.tab()
    expect(
      within(day(2)).getByText('El nombre del día es obligatorio'),
    ).toBeInTheDocument()
  })

  it('envía la estructura cargada, en el orden en pantalla', async () => {
    const { onSubmit } = renderForm()

    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar ejercicio al día 2' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'elegir Remo' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'cerrar buscador' }),
    )
    const row = exercise('Remo')
    await userEvent.type(within(row).getByLabelText(/Series/), '3')
    await userEvent.type(within(row).getByLabelText(/Repeticiones/), '12')
    await userEvent.type(within(row).getByLabelText('RIR/RPE'), 'rpe 8')
    await save()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const values = onSubmit.mock.calls[0][0]
    expect(values.days.map((d) => d.name)).toEqual(['Empuje', 'Tirón'])
    expect(values.days[1].exercises[0]).toMatchObject({
      id: null,
      exerciseId: 'x-remo',
      sets: '3',
      reps: '12',
      rirRpe: 'rpe 8',
    })
  })

  it('reordena días y ejercicios sin perder el foco', async () => {
    renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Bajar día 1' }))
    expect(dayNames()).toEqual(['Tirón', 'Empuje'])
    // Empuje quedó último: su "bajar" se deshabilita y el foco pasa a "subir"
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Subir día 2' })).toHaveFocus(),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Subir Fondos' }))
    expect(exerciseNames(2)).toEqual(['Fondos', 'Press de banca'])
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Bajar Fondos' }),
      ).toHaveFocus(),
    )
    expect(screen.getByRole('button', { name: 'Subir Fondos' })).toBeDisabled()
  })

  it('quita ejercicios y días', async () => {
    const { onSubmit } = renderForm()

    await userEvent.click(
      screen.getByRole('button', { name: 'Quitar Press de banca' }),
    )
    expect(exerciseNames(1)).toEqual(['Fondos'])
    expect(within(day(1)).getByText('1 ejercicio')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Quitar día 1' }))
    expect(dayNames()).toEqual(['Tirón'])
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Agregar día' })).toHaveFocus(),
    )

    await save()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].days).toHaveLength(1)
  })

  it('muestra los errores por campo del backend y el aviso general', async () => {
    renderForm({
      onSubmit: vi.fn().mockRejectedValue(
        new ApiError('La solicitud tiene campos inválidos', 400, {
          fieldErrors: [
            {
              field: 'days[0].exercises[1].reps',
              message: 'Las repeticiones deben estar entre 1 y 999',
            },
          ],
        }),
      ),
    })

    await save()

    const fondos = exercise('Fondos')
    expect(
      await within(fondos).findByText(
        'Las repeticiones deben estar entre 1 y 999',
      ),
    ).toBeInTheDocument()
    expect(within(fondos).getByLabelText(/Repeticiones/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La solicitud tiene campos inválidos',
    )
  })

  it('ante un 422 muestra el mensaje con la acción que arma la página', async () => {
    const message =
      'No se puede quitar el día Empuje porque tiene series registradas. Duplicá la rutina y editá la copia.'
    renderForm({
      onSubmit: vi.fn().mockRejectedValue(new ApiError(message, 422)),
      renderErrorAction: (error) =>
        error.status === 422 && <button type="button">duplicar</button>,
    })

    await save()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(message)
    expect(
      within(alert).getByRole('button', { name: 'duplicar' }),
    ).toBeInTheDocument()
  })

  it('muestra un mensaje genérico ante un error inesperado', async () => {
    renderForm({ onSubmit: vi.fn().mockRejectedValue(new Error('boom')) })

    await save()

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
