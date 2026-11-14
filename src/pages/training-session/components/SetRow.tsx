import { useForm } from '@tanstack/react-form'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type SubmitEventHandler,
} from 'react'
import { cn } from '../../../lib/cn'
import { isApiError } from '../../../lib/api'
import type { RoutineExercise } from '../../../lib/routines'
import {
  usePutPerformedSet,
  type PerformedSet,
  type SetStatus,
} from '../../../lib/training-sessions'
import { GhostButton, OutlineButton } from '../../../ui/button'
import { FormField } from '../../../ui/form-field'
import { Check, LoaderCircle, RotateCw, SkipForward } from '../../../ui/icons'
import { TextInput } from '../../../ui/input'
import {
  draftFromSet,
  isCorrection,
  validateDraft,
  type SetDraftErrors,
  type SetDraftField,
} from '../set-draft'

type SetRowProps = {
  athleteId: string
  sessionId: string
  exercise: RoutineExercise
  setNumber: number
  // la serie ya registrada; undefined si todavía está pendiente
  record?: PerformedSet
}

const DRAFT_FIELDS: SetDraftField[] = ['weight', 'reps', 'rpe', 'skipReason']
const isDraftField = (field: string): field is SetDraftField =>
  DRAFT_FIELDS.some((name) => name === field)

// el botón principal cambia según lo que pasa con la serie
type ConfirmState = 'pending' | 'correction' | 'saved' | 'saving'

const confirmClasses: Record<ConfirmState, string> = {
  pending: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  correction:
    'border-primary bg-surface text-primary hover:bg-primary-soft border-2',
  saved: 'bg-success text-success-foreground',
  saving: 'bg-primary-soft text-primary',
}

// un corte de red o un error del servidor pueden cambiar al reintentar; un 409, un 422 o un 400
// no, y su mensaje explica qué pasa
const canRetry = (error: Error) =>
  !isApiError(error) || error.status === 0 || error.status >= 500

// una serie del entrenamiento en curso: peso, repeticiones y RPE opcional precargados con lo
// planificado. Completar es un toque (el botón de la derecha); corregir y omitir están a mano.
// Cada fila tiene su propio envío: si falla la red, los datos siguen en pantalla y se reintenta
// con el mismo cuerpo, que el PUT resuelve sin duplicar (contrato 11.2)
export function SetRow({
  athleteId,
  sessionId,
  exercise,
  setNumber,
  record,
}: SetRowProps) {
  const id = useId()
  const save = usePutPerformedSet(athleteId, sessionId)
  const [errors, setErrors] = useState<SetDraftErrors>({})
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [omitting, setOmitting] = useState(false)
  // qué se envía: el botón de completar manda DONE y el de omitir, SKIPPED
  const intent = useRef<SetStatus>('DONE')
  // el formulario de omisión: al abrirlo, el foco va al motivo
  const omitRef = useRef<HTMLDivElement>(null)

  const form = useForm({
    defaultValues: draftFromSet(exercise, record),
    onSubmit: ({ value }) => {
      const result = validateDraft(intent.current, value)
      if ('errors' in result) {
        setErrors(result.errors)
        return
      }
      setErrors({})
      save.mutate(
        { routineExerciseId: exercise.id, setNumber, body: result.input },
        { onError: showServerErrors },
      )
    },
  })

  useEffect(() => {
    if (omitting) omitRef.current?.querySelector('input')?.focus()
  }, [omitting])

  // los 400 traen el campo: se marca en la fila. Lo que no es de un campo se muestra como aviso
  function showServerErrors(error: Error) {
    if (!isApiError(error) || error.fieldErrors.length === 0) return
    const mapped: SetDraftErrors = {}
    let hasUnmapped = false
    for (const { field, message } of error.fieldErrors) {
      if (isDraftField(field)) mapped[field] = message
      else hasUnmapped = true
    }
    setErrors(mapped)
    if (!hasUnmapped) save.reset()
  }

  // editar es un intento nuevo: se borra el error anterior y el mensaje del envío fallido
  const onEdit = (field: SetDraftField) => {
    setErrors((previous) => ({ ...previous, [field]: undefined }))
    if (save.isError) save.reset()
  }

  const submit = (status: SetStatus) => {
    intent.current = status
    void form.handleSubmit()
  }

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    submit('DONE')
  }

  // Enter en el motivo omite la serie; en peso o repeticiones, completa
  const handleReasonKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    submit('SKIPPED')
  }

  const cancelOmit = () => {
    setOmitting(false)
    setErrors((previous) => ({ ...previous, skipReason: undefined }))
  }

  // el reintento manda el mismo cuerpo a la misma URL (save.variables)
  const retry = () => {
    if (save.variables) save.mutate(save.variables)
  }

  const errorId = (field: SetDraftField) => `${id}-${field}-error`
  const describedBy = (field: SetDraftField) =>
    errors[field] ? errorId(field) : undefined
  const detailsId = `${id}-details`
  const rpeId = `${id}-rpe`
  const reasonId = `${id}-reason`

  const failure = save.error
  const failureRetryable = failure !== null && canRetry(failure)

  return (
    <form
      role="group"
      aria-label={`Serie ${setNumber} de ${exercise.exerciseName}`}
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 py-2"
    >
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-2 sm:gap-3">
        <span aria-hidden="true" className="text-sm font-bold tabular-nums">
          {setNumber}
        </span>
        <form.Field name="weight">
          {(field) => (
            <TextInput
              inputMode="decimal"
              autoComplete="off"
              aria-label={`Peso de la serie ${setNumber}, en kilos`}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value)
                onEdit('weight')
              }}
              onBlur={field.handleBlur}
              aria-invalid={Boolean(errors.weight)}
              aria-describedby={describedBy('weight')}
              className="h-12 text-center text-base font-semibold tabular-nums"
            />
          )}
        </form.Field>
        <form.Field name="reps">
          {(field) => (
            <TextInput
              inputMode="numeric"
              autoComplete="off"
              aria-label={`Repeticiones de la serie ${setNumber}`}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value)
                onEdit('reps')
              }}
              onBlur={field.handleBlur}
              aria-invalid={Boolean(errors.reps)}
              aria-describedby={describedBy('reps')}
              className="h-12 text-center text-base font-semibold tabular-nums"
            />
          )}
        </form.Field>
        <form.Subscribe
          selector={(state) => isCorrection(state.values, record)}
        >
          {(correction) => {
            const state: ConfirmState = save.isPending
              ? 'saving'
              : correction
                ? 'correction'
                : record?.status === 'DONE'
                  ? 'saved'
                  : 'pending'
            return <ConfirmButton state={state} setNumber={setNumber} />
          }}
        </form.Subscribe>
      </div>

      <form.Subscribe selector={(state) => isCorrection(state.values, record)}>
        {(correction) => (
          <StatusLine
            record={record}
            saving={save.isPending}
            correction={correction}
            detailsId={detailsId}
            detailsOpen={detailsOpen}
            onToggleDetails={() => {
              setDetailsOpen((open) => !open)
              setOmitting(false)
            }}
          />
        )}
      </form.Subscribe>

      {DRAFT_FIELDS.map(
        (field) =>
          errors[field] && (
            <p key={field} id={errorId(field)} className="text-danger text-sm">
              {errors[field]}
            </p>
          ),
      )}

      {failure && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-danger text-sm">
            {failure.message}
            {failureRetryable && ' Lo que cargaste sigue en pantalla.'}
          </p>
          {failureRetryable && (
            <OutlineButton
              type="button"
              size="sm"
              disabled={save.isPending}
              onClick={retry}
            >
              <RotateCw aria-hidden="true" />
              {save.isPending ? 'Reintentando…' : 'Reintentar'}
            </OutlineButton>
          )}
        </div>
      )}

      {detailsOpen && (
        <div
          id={detailsId}
          className="border-border-subtle flex flex-col gap-3 rounded-control border p-3"
        >
          <FormField
            label="RPE (opcional)"
            htmlFor={rpeId}
            hint="Del 1 al 10: qué tan pesada fue la serie."
          >
            <form.Field name="rpe">
              {(field) => (
                <TextInput
                  id={rpeId}
                  inputMode="numeric"
                  autoComplete="off"
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                    onEdit('rpe')
                  }}
                  onBlur={field.handleBlur}
                  aria-invalid={Boolean(errors.rpe)}
                  aria-describedby={describedBy('rpe')}
                  className="max-w-32"
                />
              )}
            </form.Field>
          </FormField>

          {omitting ? (
            <div ref={omitRef} className="flex flex-col gap-3">
              <FormField
                label="Motivo de la omisión"
                htmlFor={reasonId}
                required
              >
                <form.Field name="skipReason">
                  {(field) => (
                    <TextInput
                      id={reasonId}
                      autoComplete="off"
                      placeholder="ej. Dolor de rodilla"
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value)
                        onEdit('skipReason')
                      }}
                      onBlur={field.handleBlur}
                      onKeyDown={handleReasonKeyDown}
                      aria-invalid={Boolean(errors.skipReason)}
                      aria-describedby={describedBy('skipReason')}
                    />
                  )}
                </form.Field>
              </FormField>
              <div className="flex flex-wrap gap-2">
                <OutlineButton
                  type="button"
                  size="sm"
                  onClick={() => submit('SKIPPED')}
                >
                  Confirmar omisión
                </OutlineButton>
                <GhostButton type="button" size="sm" onClick={cancelOmit}>
                  Cancelar
                </GhostButton>
              </div>
            </div>
          ) : (
            <OutlineButton
              type="button"
              size="sm"
              className="self-start"
              onClick={() => setOmitting(true)}
            >
              <SkipForward aria-hidden="true" />
              Omitir serie
            </OutlineButton>
          )}
        </div>
      )}
    </form>
  )
}

type ConfirmButtonProps = { state: ConfirmState; setNumber: number }

// un solo botón de 48 px con el nombre de la acción en el aria-label. Hecha y guardando no se
// pueden tocar
function ConfirmButton({ state, setNumber }: ConfirmButtonProps) {
  const labels: Record<ConfirmState, string> = {
    pending: `Completar la serie ${setNumber}`,
    correction: `Guardar la corrección de la serie ${setNumber}`,
    saved: `Serie ${setNumber} hecha`,
    saving: `Guardando la serie ${setNumber}`,
  }
  const label = labels[state]
  const locked = state === 'saved' || state === 'saving'

  return (
    <button
      type="submit"
      disabled={locked}
      aria-label={label}
      title={label}
      className={cn(
        'rounded-control flex h-12 w-12 items-center justify-center transition-colors focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        locked ? 'cursor-default' : 'cursor-pointer',
        confirmClasses[state],
      )}
    >
      {state === 'saving' ? (
        <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
      ) : (
        <Check aria-hidden="true" />
      )}
    </button>
  )
}

type StatusLineProps = {
  record?: PerformedSet
  saving: boolean
  correction: boolean
  detailsId: string
  detailsOpen: boolean
  onToggleDetails: () => void
}

// qué pasó con la serie, en texto (no solo por color). Se anuncia al cambiar
function StatusLine({
  record,
  saving,
  correction,
  detailsId,
  detailsOpen,
  onToggleDetails,
}: StatusLineProps) {
  const text = (() => {
    if (saving) return { value: 'Guardando…', tone: 'muted' as const }
    if (correction) {
      return {
        value: 'Cambiaste la serie: guardá la corrección',
        tone: 'strong' as const,
      }
    }
    if (!record) return { value: 'Sin registrar', tone: 'muted' as const }
    if (record.status === 'SKIPPED') {
      return {
        value: `Omitida: ${record.skipReason ?? ''}`,
        tone: 'strong' as const,
      }
    }
    return {
      value: record.rpe ? `Hecha · RPE ${record.rpe}` : 'Hecha',
      tone: 'strong' as const,
    }
  })()

  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <p
        role="status"
        className={cn(
          'min-w-0 break-words',
          text.tone === 'muted' ? 'text-muted-foreground' : 'font-semibold',
        )}
      >
        {text.value}
      </p>
      <button
        type="button"
        aria-expanded={detailsOpen}
        aria-controls={detailsId}
        onClick={onToggleDetails}
        className="text-primary hover:text-primary-hover shrink-0 rounded font-semibold focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
      >
        {detailsOpen ? 'Ocultar' : 'Detalles'}
      </button>
    </div>
  )
}
