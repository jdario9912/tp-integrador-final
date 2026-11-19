import { useForm } from '@tanstack/react-form'
import { useId, useState, type SubmitEventHandler } from 'react'
import { isApiError } from '../../../lib/api'
import {
  NOTE_CONTENT_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  noteTypeLabel,
  useCreateNote,
  validateNoteContent,
  validateNoteTitle,
  type NoteInput,
  type NoteType,
} from '../../../lib/notes'
import { PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import {
  FormField,
  getFieldErrorId,
  getFieldHintId,
} from '../../../ui/form-field'
import { TextInput } from '../../../ui/input'
import { SegmentedControl } from '../../../ui/segmented-control'
import { TextArea } from '../../../ui/textarea'

type NoteFormProps = { athleteId: string }

type FieldName = keyof NoteInput

const defaultValues: NoteInput = { title: '', content: '', type: 'PRIVATE' }

const isFieldName = (field: string): field is FieldName =>
  Object.hasOwn(defaultValues, field)

const typeOptions: { value: NoteType; label: string }[] = [
  { value: 'PRIVATE', label: noteTypeLabel.PRIVATE },
  { value: 'VISIBLE_TO_ATHLETE', label: noteTypeLabel.VISIBLE_TO_ATHLETE },
]

const typeHint: Record<NoteType, string> = {
  PRIVATE: 'Solo la ves vos.',
  VISIBLE_TO_ATHLETE: 'El atleta la ve en su panel.',
}

// alta de una nota sobre el atleta (US-46). Por defecto privada: hacerla visible es una decisión
// explícita. Mismos límites que el backend; los errores del 400 van a su campo
export function NoteForm({ athleteId }: NoteFormProps) {
  const id = useId()
  const create = useCreateNote(athleteId)
  const [formError, setFormError] = useState<string>()
  const [saved, setSaved] = useState<string>()
  const fieldId = (name: FieldName) => `${id}-${name}`

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      setSaved(undefined)
      try {
        await create.mutateAsync({
          title: value.title.trim(),
          content: value.content.trim(),
          type: value.type,
        })
        formApi.reset()
        setSaved('Guardaste la nota.')
      } catch (error) {
        if (!isApiError(error)) {
          setFormError('Ocurrió un error inesperado. Intentá nuevamente.')
          return
        }
        const unmapped = error.fieldErrors.filter(
          ({ field }) => !isFieldName(field),
        )
        error.fieldErrors.forEach(({ field, message }) => {
          if (!isFieldName(field)) return
          formApi.setFieldMeta(field, (meta) => ({
            ...meta,
            errorMap: { ...meta.errorMap, onServer: message },
          }))
        })
        // 403 (atleta ajeno) y el resto llegan sin errores por campo
        if (error.fieldErrors.length === 0 || unmapped.length > 0) {
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
    <form
      noValidate
      aria-label="Nueva nota"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <form.Field
        name="title"
        validators={{ onBlur: ({ value }) => validateNoteTitle(value) }}
      >
        {(field) => {
          const error = field.state.meta.errors[0] as string | undefined
          return (
            <FormField
              label="Título"
              htmlFor={fieldId('title')}
              error={error}
              required
            >
              <TextInput
                id={fieldId('title')}
                name="title"
                maxLength={NOTE_TITLE_MAX_LENGTH}
                placeholder="ej. Técnica de sentadilla"
                value={field.state.value}
                onChange={(event) => {
                  setSaved(undefined)
                  field.handleChange(event.target.value)
                }}
                onBlur={field.handleBlur}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error ? getFieldErrorId(fieldId('title')) : undefined
                }
              />
            </FormField>
          )
        }}
      </form.Field>

      <form.Field
        name="content"
        validators={{ onBlur: ({ value }) => validateNoteContent(value) }}
      >
        {(field) => {
          const error = field.state.meta.errors[0] as string | undefined
          return (
            <FormField
              label="Contenido"
              htmlFor={fieldId('content')}
              error={error}
              hint={`Escritos: ${field.state.value.length} de ${NOTE_CONTENT_MAX_LENGTH}.`}
              required
            >
              <TextArea
                id={fieldId('content')}
                name="content"
                rows={4}
                maxLength={NOTE_CONTENT_MAX_LENGTH}
                placeholder="ej. Bajar más lento en la excéntrica y no despegar los talones."
                value={field.state.value}
                onChange={(event) => {
                  setSaved(undefined)
                  field.handleChange(event.target.value)
                }}
                onBlur={field.handleBlur}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error
                    ? getFieldErrorId(fieldId('content'))
                    : getFieldHintId(fieldId('content'))
                }
              />
            </FormField>
          )
        }}
      </form.Field>

      <form.Field name="type">
        {(field) => {
          const error = field.state.meta.errors[0] as string | undefined
          return (
            <div className="flex flex-col gap-1.5">
              <SegmentedControl
                legend="Tipo de nota"
                name={fieldId('type')}
                variant="chips"
                options={typeOptions}
                value={field.state.value}
                onValueChange={(value) => {
                  setSaved(undefined)
                  field.handleChange(value)
                }}
              />
              <p
                className={
                  error
                    ? 'text-danger text-sm'
                    : 'text-muted-foreground text-sm'
                }
              >
                {error ?? typeHint[field.state.value]}
              </p>
            </div>
          )
        }}
      </form.Field>

      {formError && <Callout tone="danger">{formError}</Callout>}
      {saved && (
        <Callout tone="success" role="status">
          {saved}
        </Callout>
      )}

      <div className="flex sm:justify-end">
        <PrimaryButton
          type="submit"
          className="w-full sm:w-auto"
          disabled={create.isPending}
        >
          {create.isPending ? 'Guardando...' : 'Guardar nota'}
        </PrimaryButton>
      </div>
    </form>
  )
}
