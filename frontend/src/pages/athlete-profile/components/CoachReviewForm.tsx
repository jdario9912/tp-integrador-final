import { useForm } from '@tanstack/react-form'
import { useId, useState, type SubmitEventHandler } from 'react'
import { isApiError } from '../../../lib/api'
import {
  formatReviewedDate,
  REVIEW_OBSERVATION_MAX_LENGTH,
  toObservationInput,
  useSessionReview,
  validateReviewObservation,
  type TrainingSession,
} from '../../../lib/training-sessions'
import { PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import {
  FormField,
  getFieldErrorId,
  getFieldHintId,
} from '../../../ui/form-field'
import { TextArea } from '../../../ui/textarea'

type CoachReviewFormProps = {
  athleteId: string
  session: TrainingSession
}

const HINT = `Opcional. Hasta ${REVIEW_OBSERVATION_MAX_LENGTH} caracteres. La ve el atleta.`

// revisión del entrenador (US-21): marca la sesión finalizada como revisada, con una observación
// opcional. Revisar otra vez reemplaza la observación y la fecha
export function CoachReviewForm({ athleteId, session }: CoachReviewFormProps) {
  const titleId = useId()

  // solo se revisan las finalizadas (contrato 25: una sesión en curso o cancelada responde 422)
  if (session.status !== 'FINISHED') {
    return (
      <section aria-labelledby={titleId} className="flex flex-col gap-3">
        <h3 id={titleId} className="text-[15px] font-semibold">
          Revisión para el atleta
        </h3>
        <Callout tone="info">
          Solo se pueden revisar los entrenamientos finalizados. Este está
          cancelado.
        </Callout>
      </section>
    )
  }

  // con key: cambiar de sesión arranca el formulario con su observación
  return (
    <ReviewEditor key={session.id} athleteId={athleteId} session={session} />
  )
}

function ReviewEditor({ athleteId, session }: CoachReviewFormProps) {
  const titleId = useId()
  const fieldId = useId()
  const review = useSessionReview(athleteId, session.id)
  const [formError, setFormError] = useState<string>()
  const [saved, setSaved] = useState<string>()
  const current = session.review
  const observationId = `${fieldId}-observation`

  const form = useForm({
    defaultValues: { observation: current?.observation ?? '' },
    onSubmit: async ({ value }) => {
      setFormError(undefined)
      setSaved(undefined)
      try {
        await review.mutateAsync({
          observation: toObservationInput(value.observation),
        })
        setSaved(
          current
            ? 'Guardaste los cambios de la revisión.'
            : 'Marcaste el entrenamiento como revisado.',
        )
      } catch (error) {
        setFormError(
          isApiError(error)
            ? error.message
            : 'Ocurrió un error inesperado. Intentá nuevamente.',
        )
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 id={titleId} className="text-[15px] font-semibold">
          Revisión para el atleta
        </h3>
        {current ? (
          <p className="text-muted-foreground text-sm">
            Revisado el{' '}
            <time dateTime={current.reviewedAt}>
              {formatReviewedDate(current.reviewedAt)}
            </time>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Todavía no está revisado.
          </p>
        )}
      </div>

      <form noValidate className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <form.Field
          name="observation"
          validators={{
            onBlur: ({ value }) => validateReviewObservation(value),
          }}
        >
          {(field) => {
            const error = field.state.meta.errors[0] as string | undefined
            const length = field.state.value.length
            return (
              <FormField
                label="Observación"
                htmlFor={observationId}
                error={error}
                hint={`${HINT} Escritas: ${length} de ${REVIEW_OBSERVATION_MAX_LENGTH}.`}
              >
                <TextArea
                  id={observationId}
                  name="observation"
                  rows={4}
                  maxLength={REVIEW_OBSERVATION_MAX_LENGTH}
                  placeholder="ej. Buen ritmo en el tren superior. La próxima, más descanso entre series."
                  value={field.state.value}
                  onChange={(event) => {
                    setSaved(undefined)
                    field.handleChange(event.target.value)
                  }}
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
        {saved && (
          <Callout tone="success" role="status">
            {saved}
          </Callout>
        )}

        <div className="flex justify-end">
          <PrimaryButton type="submit" disabled={review.isPending}>
            {review.isPending
              ? 'Guardando...'
              : current
                ? 'Guardar revisión'
                : 'Marcar como revisada'}
          </PrimaryButton>
        </div>
      </form>
    </section>
  )
}
