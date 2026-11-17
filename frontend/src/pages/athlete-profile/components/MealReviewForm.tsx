import { useForm } from '@tanstack/react-form'
import { useId, useState, type SubmitEventHandler } from 'react'
import { isApiError } from '../../../lib/api'
import {
  MEAL_REVIEW_OBSERVATION_MAX_LENGTH,
  toMealReviewInput,
  useMealReview,
  validateMealReviewObservation,
  type Meal,
} from '../../../lib/meals'
import { GhostButton, PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import {
  FormField,
  getFieldErrorId,
  getFieldHintId,
} from '../../../ui/form-field'
import { TextArea } from '../../../ui/textarea'

type MealReviewFormProps = {
  athleteId: string
  meal: Meal
  // la revisión se guardó: recibe el aviso para el entrenador
  onSaved: (notice: string) => void
  onCancel: () => void
}

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intentá nuevamente.'
const HINT = `Opcional. Hasta ${MEAL_REVIEW_OBSERVATION_MAX_LENGTH} caracteres. Lo ve el atleta.`

// revisión del entrenador sobre una comida (US-25): la marca como revisada, con un comentario
// opcional. Revisar otra vez reemplaza el comentario y la fecha
export function MealReviewForm({
  athleteId,
  meal,
  onSaved,
  onCancel,
}: MealReviewFormProps) {
  const fieldId = useId()
  const observationId = `${fieldId}-observation`
  const review = useMealReview(athleteId)
  const [formError, setFormError] = useState<string>()
  const current = meal.review

  const form = useForm({
    defaultValues: { observation: current?.observation ?? '' },
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      try {
        await review.mutateAsync({
          mealId: meal.id,
          input: toMealReviewInput(value.observation),
        })
        onSaved(
          current
            ? 'Guardaste los cambios de la revisión.'
            : 'Marcaste la comida como revisada.',
        )
      } catch (error) {
        if (!isApiError(error)) {
          setFormError(UNEXPECTED_ERROR)
          return
        }
        // 400 del comentario: el error va al campo; el resto (403, 404) es un aviso general
        const fieldError = error.fieldErrors.find(
          ({ field }) => field === 'observation',
        )
        if (fieldError) {
          formApi.setFieldMeta('observation', (meta) => ({
            ...meta,
            errorMap: { ...meta.errorMap, onServer: fieldError.message },
          }))
          return
        }
        setFormError(error.message)
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <form.Field
        name="observation"
        validators={{
          onBlur: ({ value }) => validateMealReviewObservation(value),
        }}
      >
        {(field) => {
          const error = field.state.meta.errors[0] as string | undefined
          const length = field.state.value.length
          return (
            <FormField
              label="Comentario para el atleta"
              htmlFor={observationId}
              error={error}
              hint={`${HINT} Escritos: ${length} de ${MEAL_REVIEW_OBSERVATION_MAX_LENGTH}.`}
            >
              <TextArea
                id={observationId}
                name="observation"
                rows={3}
                maxLength={MEAL_REVIEW_OBSERVATION_MAX_LENGTH}
                placeholder="ej. Buena porción de proteína. Sumá verduras a la cena."
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error
                    ? getFieldErrorId(observationId)
                    : getFieldHintId(observationId)
                }
              />
            </FormField>
          )
        }}
      </form.Field>

      {formError && <Callout tone="danger">{formError}</Callout>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <GhostButton disabled={review.isPending} onClick={onCancel}>
          Cancelar
        </GhostButton>
        <PrimaryButton type="submit" disabled={review.isPending}>
          {review.isPending
            ? 'Guardando...'
            : current
              ? 'Guardar revisión'
              : 'Marcar como revisada'}
        </PrimaryButton>
      </div>
    </form>
  )
}
