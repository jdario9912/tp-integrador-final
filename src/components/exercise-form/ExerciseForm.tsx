import { useForm } from '@tanstack/react-form'
import { useState, type SubmitEventHandler } from 'react'
import { isApiError } from '../../lib/api'
import {
  groupByRegion,
  isMuscleGroupCode,
  type MuscleGroup,
} from '../../lib/exercises'
import { GhostButton, PrimaryButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { SectionCard } from '../../ui/card'
import { FormField, getFieldErrorId, getFieldHintId } from '../../ui/form-field'
import { Dumbbell } from '../../ui/icons'
import { TextInput } from '../../ui/input'
import { Select } from '../../ui/select'
import { TextArea } from '../../ui/textarea'
import { emptyExerciseFormValues } from './mappers'
import type { ExerciseFieldName, ExerciseFormValues } from './types'
import {
  DESCRIPTION_MAX_LENGTH,
  EXERCISE_NAME_MAX_LENGTH,
  VIDEO_URL_MAX_LENGTH,
  validateDescription,
  validateExerciseName,
  validateMuscleGroup,
  validateVideoUrl,
} from './validation'

type ExerciseFormProps = {
  defaultValues?: ExerciseFormValues
  muscleGroups: MuscleGroup[]
  // si rechaza con un ApiError, sus errores se muestran en el formulario
  onSubmit: (values: ExerciseFormValues) => Promise<void>
  onCancel: () => void
  submitLabel: string
  // prefijo de los ids de los campos, para que no choquen si hay dos formularios
  idPrefix: string
}

const isExerciseFieldName = (field: string): field is ExerciseFieldName =>
  Object.hasOwn(emptyExerciseFormValues, field)

const DESCRIPTION_HINT = `Opcional. Hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`
const VIDEO_URL_HINT =
  'Opcional. Link a un video de referencia (YouTube, Vimeo...).'

// datos del ejercicio: lo comparten el alta y la edición
export function ExerciseForm({
  defaultValues = emptyExerciseFormValues,
  muscleGroups,
  onSubmit,
  onCancel,
  submitLabel,
  idPrefix,
}: ExerciseFormProps) {
  const [formError, setFormError] = useState<string>()

  const fieldId = (name: ExerciseFieldName) => `${idPrefix}-${name}`

  // el error tiene prioridad sobre el hint, igual que en FormField
  const describedBy = (
    name: ExerciseFieldName,
    error?: string,
    hint?: string,
  ) => {
    if (error) return getFieldErrorId(fieldId(name))
    if (hint) return getFieldHintId(fieldId(name))
    return undefined
  }

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      try {
        await onSubmit(value)
      } catch (error) {
        if (!isApiError(error)) {
          setFormError('Ocurrió un error inesperado. Intentá nuevamente.')
          return
        }

        const unmappedErrors = error.fieldErrors.filter(
          ({ field }) => !isExerciseFieldName(field),
        )
        error.fieldErrors.forEach(({ field, message }) => {
          if (!isExerciseFieldName(field)) return
          // onServer se limpia solo cuando el usuario vuelve a editar el campo
          formApi.setFieldMeta(field, (meta) => ({
            ...meta,
            errorMap: { ...meta.errorMap, onServer: message },
          }))
        })

        // 409 (nombre repetido) y 403 llegan sin errores por campo
        if (error.fieldErrors.length === 0 || unmappedErrors.length > 0) {
          setFormError(error.message)
        }
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  return (
    <form noValidate className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <SectionCard title="Datos del ejercicio" icon={<Dumbbell />}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <form.Field name="name" validators={{ onBlur: validateExerciseName }}>
            {(field) => {
              const error = field.state.meta.errors[0] as string | undefined
              return (
                <FormField
                  label="Nombre"
                  htmlFor={fieldId('name')}
                  error={error}
                  required
                >
                  <TextInput
                    id={fieldId('name')}
                    name="name"
                    autoComplete="off"
                    placeholder="ej. Press de banca"
                    maxLength={EXERCISE_NAME_MAX_LENGTH}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy('name', error)}
                  />
                </FormField>
              )
            }}
          </form.Field>

          <form.Field
            name="muscleGroup"
            validators={{ onBlur: validateMuscleGroup }}
          >
            {(field) => {
              const error = field.state.meta.errors[0] as string | undefined
              return (
                <FormField
                  label="Grupo muscular"
                  htmlFor={fieldId('muscleGroup')}
                  error={error}
                  required
                >
                  <Select
                    id={fieldId('muscleGroup')}
                    name="muscleGroup"
                    value={field.state.value}
                    onChange={({ target: { value } }) =>
                      field.handleChange(isMuscleGroupCode(value) ? value : '')
                    }
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy('muscleGroup', error)}
                  >
                    <option value="">Elegí un grupo muscular</option>
                    {groupByRegion(muscleGroups).map(
                      ({ region, label, groups }) => (
                        <optgroup key={region} label={label}>
                          {groups.map(({ code, name }) => (
                            <option key={code} value={code}>
                              {name}
                            </option>
                          ))}
                        </optgroup>
                      ),
                    )}
                  </Select>
                </FormField>
              )
            }}
          </form.Field>

          <form.Field name="videoUrl" validators={{ onBlur: validateVideoUrl }}>
            {(field) => {
              const error = field.state.meta.errors[0] as string | undefined
              return (
                <FormField
                  label="Video"
                  htmlFor={fieldId('videoUrl')}
                  error={error}
                  hint={VIDEO_URL_HINT}
                  className="sm:col-span-2"
                >
                  <TextInput
                    id={fieldId('videoUrl')}
                    name="videoUrl"
                    type="url"
                    autoComplete="off"
                    placeholder="https://..."
                    maxLength={VIDEO_URL_MAX_LENGTH}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy(
                      'videoUrl',
                      error,
                      VIDEO_URL_HINT,
                    )}
                  />
                </FormField>
              )
            }}
          </form.Field>

          <form.Field
            name="description"
            validators={{ onBlur: validateDescription }}
          >
            {(field) => {
              const error = field.state.meta.errors[0] as string | undefined
              return (
                <FormField
                  label="Descripción"
                  htmlFor={fieldId('description')}
                  error={error}
                  hint={DESCRIPTION_HINT}
                  className="sm:col-span-2"
                >
                  <TextArea
                    id={fieldId('description')}
                    name="description"
                    rows={4}
                    placeholder="Técnica, indicaciones, variantes..."
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy(
                      'description',
                      error,
                      DESCRIPTION_HINT,
                    )}
                  />
                </FormField>
              )
            }}
          </form.Field>
        </div>
      </SectionCard>

      {formError && <Callout tone="danger">{formError}</Callout>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <GhostButton size="lg" onClick={onCancel}>
          Cancelar
        </GhostButton>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <PrimaryButton type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : submitLabel}
            </PrimaryButton>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
