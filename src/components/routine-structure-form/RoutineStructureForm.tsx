import { useForm } from '@tanstack/react-form'
import {
  useEffect,
  useId,
  useState,
  type ReactNode,
  type SubmitEventHandler,
} from 'react'
import { isApiError, type ApiError } from '../../lib/api'
import { muscleGroupName, type MuscleGroup } from '../../lib/exercises'
import { formatExercisesCount } from '../../lib/routines'
import { Badge } from '../../ui/badge'
import { DashedButton, GhostButton, PrimaryButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { Card } from '../../ui/card'
import { EmptyState } from '../../ui/empty-state'
import { FormField, getFieldErrorId } from '../../ui/form-field'
import { IconButton } from '../../ui/icon-button'
import { ArrowDown, ArrowUp, CalendarDays, Plus, Trash2 } from '../../ui/icons'
import { NumberInput, TextInput } from '../../ui/input'
import {
  isStructureFieldPath,
  newDayFormValues,
  newExerciseFormValues,
} from './mappers'
import type {
  PickedExercise,
  RoutineExerciseFormValues,
  RoutineStructureFormValues,
} from './types'
import {
  DAY_NAME_MAX_LENGTH,
  MAX_DAYS,
  MAX_EXERCISES_PER_DAY,
  REPS_MAX,
  REST_MAX,
  SETS_MAX,
  TECHNIQUE_NOTE_MAX_LENGTH,
  validateDayName,
  validateRecommendedWeight,
  validateReps,
  validateRest,
  validateRirRpe,
  validateSets,
  validateTechniqueNote,
  WEIGHT_MAX,
} from './validation'

export type ExercisePickerProps = {
  onPick: (exercise: PickedExercise) => void
  onClose: () => void
}

type RoutineStructureFormProps = {
  defaultValues: RoutineStructureFormValues
  // para mostrar el nombre del grupo muscular; sin cargar se muestra el código
  muscleGroups?: MuscleGroup[]
  // si rechaza con un ApiError, sus errores se muestran en el formulario
  onSubmit: (values: RoutineStructureFormValues) => Promise<void>
  onCancel: () => void
  // buscador del catálogo: lo arma la página, que es la que pide los ejercicios
  renderExercisePicker: (props: ExercisePickerProps) => ReactNode
  // acción extra en el aviso de un error del backend (ej. duplicar ante un 422)
  renderErrorAction?: (error: ApiError) => ReactNode
  // prefijo de los ids de los campos, para que no choquen si hay dos formularios
  idPrefix: string
}

type EditableExerciseField = keyof Pick<
  RoutineExerciseFormValues,
  'sets' | 'reps' | 'recommendedWeight' | 'rest' | 'rirRpe' | 'techniqueNote'
>

type ExerciseFieldConfig = {
  name: EditableExerciseField
  label: string
  validate: (field: { value: string }) => string | undefined
  required?: boolean
  numeric?: { min: number; max: number; step: number | 'any' }
  inputMode?: 'numeric' | 'decimal'
  suffix?: string
  placeholder?: string
  maxLength?: number
  className?: string
}

// en el orden en que se cargan: la nota, más larga, ocupa toda la fila
const exerciseFields: ExerciseFieldConfig[] = [
  {
    name: 'sets',
    label: 'Series',
    validate: validateSets,
    required: true,
    numeric: { min: 1, max: SETS_MAX, step: 1 },
    inputMode: 'numeric',
    placeholder: '0',
  },
  {
    name: 'reps',
    label: 'Repeticiones',
    validate: validateReps,
    required: true,
    numeric: { min: 1, max: REPS_MAX, step: 1 },
    inputMode: 'numeric',
    placeholder: '0',
  },
  {
    name: 'recommendedWeight',
    label: 'Peso',
    validate: validateRecommendedWeight,
    numeric: { min: 0, max: WEIGHT_MAX, step: 'any' },
    inputMode: 'decimal',
    suffix: 'kg',
    placeholder: '0',
  },
  {
    name: 'rest',
    label: 'Descanso',
    validate: validateRest,
    numeric: { min: 0, max: REST_MAX, step: 1 },
    inputMode: 'numeric',
    suffix: 'seg',
    placeholder: '0',
  },
  {
    name: 'rirRpe',
    label: 'RIR/RPE',
    validate: validateRirRpe,
    placeholder: 'RIR 2 o RPE 8',
    maxLength: 10,
  },
  {
    name: 'techniqueNote',
    label: 'Nota técnica',
    validate: validateTechniqueNote,
    placeholder: 'ej. Bajar en 3 segundos, codos a 45°',
    maxLength: TECHNIQUE_NOTE_MAX_LENGTH,
    className: 'col-span-full',
  },
]

type FormError = { message: string; error?: ApiError }

type FocusTarget = { id: string; select?: boolean }

// después de mover, el foco sigue en el mismo botón; si el ítem llegó a un borde ese botón queda
// deshabilitado y el foco pasa al de la dirección contraria
const moveFocusPart = (target: number, length: number, offset: -1 | 1) => {
  const reachedEdge = target === 0 || target === length - 1
  const goesUp = offset === -1 ? !reachedEdge : reachedEdge
  return goesUp ? 'up' : 'down'
}

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intentá nuevamente.'

// días y ejercicios de la rutina. Se edita todo en el navegador y se guarda en un solo envío
export function RoutineStructureForm({
  defaultValues,
  muscleGroups,
  onSubmit,
  onCancel,
  renderExercisePicker,
  renderErrorAction,
  idPrefix,
}: RoutineStructureFormProps) {
  const [formError, setFormError] = useState<FormError>()
  // día con el buscador de ejercicios abierto: uno a la vez
  const [pickerDayKey, setPickerDayKey] = useState<string>()
  const [focusTarget, setFocusTarget] = useState<FocusTarget>()

  // al reordenar o quitar, React mueve o desmonta el elemento con foco: se devuelve después de
  // renderizar. Cada acción crea un objeto nuevo, así que el efecto corre una vez por acción
  useEffect(() => {
    if (!focusTarget) return
    const element = document.getElementById(focusTarget.id)
    element?.focus()
    if (focusTarget.select && element instanceof HTMLInputElement) {
      element.select()
    }
  }, [focusTarget])

  const itemId = (key: string, part: string) => `${idPrefix}-${key}-${part}`

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      try {
        await onSubmit(value)
      } catch (error) {
        if (!isApiError(error)) {
          setFormError({ message: UNEXPECTED_ERROR })
          return
        }

        // onServer se limpia solo cuando el usuario vuelve a editar el campo
        error.fieldErrors.forEach(({ field, message }) => {
          if (isStructureFieldPath(value, field)) {
            formApi.setFieldMeta(field, (meta) => ({
              ...meta,
              errorMap: { ...meta.errorMap, onServer: message },
            }))
          }
        })

        // el formulario es largo: el aviso general se muestra siempre, aunque el error esté en un
        // campo, para que se vea junto al botón de guardar
        setFormError({ message: error.message, error })
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  const pickExercise = (dayKey: string, exercise: PickedExercise) => {
    const days = form.getFieldValue('days')
    const dayIndex = days.findIndex((day) => day.key === dayKey)
    if (dayIndex === -1) return
    if (days[dayIndex].exercises.length >= MAX_EXERCISES_PER_DAY) return
    form.pushFieldValue(
      `days[${dayIndex}].exercises`,
      newExerciseFormValues(exercise),
    )
  }

  const renderExerciseField = (
    dayIndex: number,
    exerciseIndex: number,
    exerciseKey: string,
    config: ExerciseFieldConfig,
  ) => (
    <form.Field
      key={config.name}
      name={`days[${dayIndex}].exercises[${exerciseIndex}].${config.name}`}
      validators={{ onBlur: config.validate }}
    >
      {(field) => {
        const error = field.state.meta.errors[0] as string | undefined
        const id = itemId(exerciseKey, config.name)
        const inputProps = {
          id,
          name: field.name,
          autoComplete: 'off',
          placeholder: config.placeholder,
          value: field.state.value,
          onChange: (event: { target: { value: string } }) =>
            field.handleChange(event.target.value),
          onBlur: field.handleBlur,
          'aria-invalid': Boolean(error),
          'aria-describedby': error ? getFieldErrorId(id) : undefined,
        }
        return (
          <FormField
            label={config.label}
            htmlFor={id}
            error={error}
            required={config.required}
            className={config.className}
          >
            {config.numeric ? (
              <NumberInput
                {...inputProps}
                inputMode={config.inputMode}
                min={config.numeric.min}
                max={config.numeric.max}
                step={config.numeric.step}
                suffix={config.suffix}
              />
            ) : (
              <TextInput {...inputProps} maxLength={config.maxLength} />
            )}
          </FormField>
        )
      }}
    </form.Field>
  )

  return (
    <form noValidate className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <form.Field name="days" mode="array">
        {(daysField) => {
          const days = daysField.state.value

          const addDay = () => {
            const day = newDayFormValues(days.length + 1)
            daysField.pushValue(day)
            setFocusTarget({ id: itemId(day.key, 'name'), select: true })
          }

          return (
            <>
              {days.length === 0 ? (
                <Card>
                  <EmptyState
                    size="sm"
                    icon={<CalendarDays />}
                    title="La rutina todavía no tiene días"
                    description="Agregá los días de entrenamiento y cargá los ejercicios de cada uno."
                  />
                </Card>
              ) : (
                <ol
                  aria-label="Días de la rutina"
                  className="flex flex-col gap-5"
                >
                  {days.map((day, dayIndex) => {
                    const dayNumber = dayIndex + 1
                    const isFirst = dayIndex === 0
                    const isLast = dayIndex === days.length - 1
                    const moveDay = (offset: -1 | 1) => {
                      const target = dayIndex + offset
                      daysField.moveValue(dayIndex, target)
                      setFocusTarget({
                        id: itemId(
                          day.key,
                          moveFocusPart(target, days.length, offset),
                        ),
                      })
                    }

                    const removeDay = () => {
                      daysField.removeValue(dayIndex)
                      setFocusTarget({ id: itemId('days', 'add') })
                    }

                    return (
                      <li key={day.key}>
                        {/* array propio: el de los días solo se vuelve a renderizar cuando cambia su largo */}
                        <form.Field
                          name={`days[${dayIndex}].exercises`}
                          mode="array"
                        >
                          {(exercisesField) => {
                            const exercises = exercisesField.state.value
                            const isFull =
                              exercises.length >= MAX_EXERCISES_PER_DAY
                            return (
                              <Card
                                padding="none"
                                aria-label={`Día ${dayNumber}`}
                              >
                                <div className="flex flex-wrap items-end gap-3 p-4 sm:p-5">
                                  <span
                                    aria-hidden="true"
                                    className="bg-primary-soft-strong text-primary mb-1.5 flex size-9 shrink-0 items-center justify-center rounded-full font-bold"
                                  >
                                    {dayNumber}
                                  </span>
                                  <form.Field
                                    name={`days[${dayIndex}].name`}
                                    validators={{ onBlur: validateDayName }}
                                  >
                                    {(field) => {
                                      const error = field.state.meta
                                        .errors[0] as string | undefined
                                      const id = itemId(day.key, 'name')
                                      return (
                                        <FormField
                                          label="Nombre del día"
                                          htmlFor={id}
                                          error={error}
                                          required
                                          className="min-w-0 flex-1 basis-48"
                                        >
                                          <TextInput
                                            id={id}
                                            name={field.name}
                                            autoComplete="off"
                                            placeholder="ej. Empuje"
                                            maxLength={DAY_NAME_MAX_LENGTH}
                                            value={field.state.value}
                                            onChange={(event) =>
                                              field.handleChange(
                                                event.target.value,
                                              )
                                            }
                                            onBlur={field.handleBlur}
                                            aria-invalid={Boolean(error)}
                                            aria-describedby={
                                              error
                                                ? getFieldErrorId(id)
                                                : undefined
                                            }
                                          />
                                        </FormField>
                                      )
                                    }}
                                  </form.Field>
                                  <div className="mb-0.5 flex items-center gap-1">
                                    <Badge className="mr-2 self-center">
                                      {formatExercisesCount(exercises.length)}
                                    </Badge>
                                    <IconButton
                                      id={itemId(day.key, 'up')}
                                      aria-label={`Subir día ${dayNumber}`}
                                      disabled={isFirst}
                                      onClick={() => moveDay(-1)}
                                    >
                                      <ArrowUp aria-hidden="true" />
                                    </IconButton>
                                    <IconButton
                                      id={itemId(day.key, 'down')}
                                      aria-label={`Bajar día ${dayNumber}`}
                                      disabled={isLast}
                                      onClick={() => moveDay(1)}
                                    >
                                      <ArrowDown aria-hidden="true" />
                                    </IconButton>
                                    <IconButton
                                      aria-label={`Quitar día ${dayNumber}`}
                                      className="hover:bg-danger-soft hover:text-danger"
                                      onClick={removeDay}
                                    >
                                      <Trash2 aria-hidden="true" />
                                    </IconButton>
                                  </div>
                                </div>

                                <div className="border-border-subtle bg-muted/50 flex flex-col gap-3 border-t p-4 sm:p-5">
                                  {exercises.length > 0 && (
                                    <ol
                                      aria-label={`Ejercicios del día ${dayNumber}`}
                                      className="flex flex-col gap-3"
                                    >
                                      {exercises.map(
                                        (exercise, exerciseIndex) => (
                                          <ExerciseItem
                                            key={exercise.key}
                                            exercise={exercise}
                                            position={exerciseIndex + 1}
                                            muscleGroupLabel={muscleGroupName(
                                              muscleGroups,
                                              exercise.muscleGroup,
                                            )}
                                            upId={itemId(exercise.key, 'up')}
                                            downId={itemId(
                                              exercise.key,
                                              'down',
                                            )}
                                            isFirst={exerciseIndex === 0}
                                            isLast={
                                              exerciseIndex ===
                                              exercises.length - 1
                                            }
                                            onMove={(offset) => {
                                              const target =
                                                exerciseIndex + offset
                                              exercisesField.moveValue(
                                                exerciseIndex,
                                                target,
                                              )
                                              setFocusTarget({
                                                id: itemId(
                                                  exercise.key,
                                                  moveFocusPart(
                                                    target,
                                                    exercises.length,
                                                    offset,
                                                  ),
                                                ),
                                              })
                                            }}
                                            onRemove={() => {
                                              exercisesField.removeValue(
                                                exerciseIndex,
                                              )
                                              setFocusTarget({
                                                id: itemId(day.key, 'add'),
                                              })
                                            }}
                                          >
                                            {exerciseFields.map((config) =>
                                              renderExerciseField(
                                                dayIndex,
                                                exerciseIndex,
                                                exercise.key,
                                                config,
                                              ),
                                            )}
                                          </ExerciseItem>
                                        ),
                                      )}
                                    </ol>
                                  )}

                                  {pickerDayKey === day.key && !isFull ? (
                                    renderExercisePicker({
                                      onPick: (exercise) =>
                                        pickExercise(day.key, exercise),
                                      onClose: () => {
                                        setPickerDayKey(undefined)
                                        setFocusTarget({
                                          id: itemId(day.key, 'add'),
                                        })
                                      },
                                    })
                                  ) : isFull ? (
                                    <p className="text-muted-foreground text-sm">
                                      Un día admite hasta{' '}
                                      {MAX_EXERCISES_PER_DAY} ejercicios.
                                    </p>
                                  ) : (
                                    <DashedButton
                                      id={itemId(day.key, 'add')}
                                      onClick={() => setPickerDayKey(day.key)}
                                      aria-label={`Agregar ejercicio al día ${dayNumber}`}
                                    >
                                      <Plus aria-hidden="true" /> Agregar
                                      ejercicio
                                    </DashedButton>
                                  )}
                                </div>
                              </Card>
                            )
                          }}
                        </form.Field>
                      </li>
                    )
                  })}
                </ol>
              )}

              <div className="flex flex-col gap-2">
                <DashedButton
                  id={itemId('days', 'add')}
                  size="lg"
                  disabled={days.length >= MAX_DAYS}
                  onClick={addDay}
                >
                  <Plus aria-hidden="true" /> Agregar día
                </DashedButton>
                {days.length >= MAX_DAYS && (
                  <p className="text-muted-foreground text-center text-sm">
                    Una rutina admite hasta {MAX_DAYS} días.
                  </p>
                )}
              </div>
            </>
          )
        }}
      </form.Field>

      <div className="border-border-subtle bg-background sticky bottom-0 z-10 -mb-2 flex flex-col gap-3 border-t py-4">
        {formError ? (
          <Callout tone="danger">
            <span className="flex flex-col items-start gap-3">
              {formError.message}
              {formError.error && renderErrorAction?.(formError.error)}
            </span>
          </Callout>
        ) : (
          <form.Subscribe
            selector={(state) => state.submissionAttempts > 0 && !state.isValid}
          >
            {(hasErrors) =>
              hasErrors && (
                <Callout tone="danger">Revisá los campos marcados.</Callout>
              )
            }
          </form.Subscribe>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <GhostButton size="lg" onClick={onCancel}>
            Cancelar
          </GhostButton>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <PrimaryButton type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar estructura'}
              </PrimaryButton>
            )}
          </form.Subscribe>
        </div>
      </div>
    </form>
  )
}

type ExerciseItemProps = {
  exercise: RoutineExerciseFormValues
  position: number
  muscleGroupLabel: string
  upId: string
  downId: string
  isFirst: boolean
  isLast: boolean
  onMove: (offset: -1 | 1) => void
  onRemove: () => void
  // los campos del ejercicio, conectados al formulario
  children: ReactNode
}

function ExerciseItem({
  exercise,
  position,
  muscleGroupLabel,
  upId,
  downId,
  isFirst,
  isLast,
  onMove,
  onRemove,
  children,
}: ExerciseItemProps) {
  const titleId = useId()
  const name = exercise.exerciseName

  return (
    <li
      aria-labelledby={titleId}
      className="rounded-control border-border-subtle bg-surface flex flex-col gap-3 border p-3 sm:p-4"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="text-muted-foreground mt-0.5 w-5 shrink-0 text-sm font-semibold tabular-nums"
        >
          {position}.
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 id={titleId} className="text-[15px] font-semibold break-words">
            {name}
          </h3>
          <Badge tone="primary" variant="outline" shape="pill">
            {muscleGroupLabel}
          </Badge>
        </div>
        <div className="-mt-1.5 -mr-1.5 flex shrink-0">
          <IconButton
            id={upId}
            aria-label={`Subir ${name}`}
            disabled={isFirst}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" />
          </IconButton>
          <IconButton
            id={downId}
            aria-label={`Bajar ${name}`}
            disabled={isLast}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label={`Quitar ${name}`}
            className="hover:bg-danger-soft hover:text-danger"
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {children}
      </div>
    </li>
  )
}
