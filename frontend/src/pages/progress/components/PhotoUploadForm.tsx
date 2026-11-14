import { useForm } from '@tanstack/react-form'
import { useEffect, useRef, useState, type SubmitEventHandler } from 'react'
import { isApiError } from '../../../lib/api'
import {
  formatMegabytes,
  PROGRESS_PHOTO_MAX_BYTES,
  PROGRESS_PHOTO_TYPE_OPTIONS,
  validatePhotoFile,
  type ProgressPhotoUploadInput,
} from '../../../lib/progress-photos'
import { PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import {
  FormField,
  getFieldErrorId,
  getFieldHintId,
} from '../../../ui/form-field'
import { FileInput } from '../../../ui/file-input'
import { DateInput } from '../../../ui/input'
import { SegmentedControl } from '../../../ui/segmented-control'
import {
  PHOTO_UNEXPECTED_ERROR,
  PHOTO_UPLOAD_UNAVAILABLE,
  photoErrorMessage,
} from '../photo-messages'
import { PHOTOS_UPLOAD_FORM_ID } from '../photo-element-ids'
import { validatePhotoTakenOn } from '../photo-validation'
import type { PhotoFieldName, PhotoFormValues } from '../types'

type PhotoUploadFormProps = {
  // hoy en la zona de la app: máximo de la fecha y valor inicial
  today: string
  // rechaza con el ApiError para que el formulario muestre el error del backend
  onSubmit: (input: ProgressPhotoUploadInput) => Promise<void>
}

const ACCEPT = 'image/jpeg,image/png,image/webp'
const FILE_HINT = `JPG, PNG o WebP, hasta ${formatMegabytes(PROGRESS_PHOTO_MAX_BYTES)}.`
const DATE_HINT = 'Si no la cambiás, es hoy.'

// orden de foco cuando hay errores: el primer campo con error recibe el foco
const FIELD_ORDER: readonly PhotoFieldName[] = ['file', 'type', 'takenOn']

const isPhotoFieldName = (field: string): field is PhotoFieldName =>
  FIELD_ORDER.some((name) => name === field)

// formulario de subida: tipo, fecha y archivo. Valida el archivo antes de enviar (formato y
// tamaño); el servidor sigue siendo la autoridad y sus errores se muestran igual
export function PhotoUploadForm({ today, onSubmit }: PhotoUploadFormProps) {
  const [formError, setFormError] = useState<string>()
  const formErrorRef = useRef<HTMLDivElement>(null)

  const fieldId = (name: PhotoFieldName) => `${PHOTOS_UPLOAD_FORM_ID}-${name}`
  const focusField = (name: PhotoFieldName) =>
    document.getElementById(fieldId(name))?.focus()

  const describedBy = (name: PhotoFieldName, error?: string, hint?: string) => {
    if (error) return getFieldErrorId(fieldId(name))
    if (hint) return getFieldHintId(fieldId(name))
    return undefined
  }

  // el aviso general recibe el foco al aparecer: el botón se deshabilita mientras se envía
  useEffect(() => {
    if (formError) formErrorRef.current?.focus()
  }, [formError])

  const form = useForm({
    defaultValues: {
      type: 'FRONT',
      takenOn: today,
      file: null,
    } as PhotoFormValues,
    onSubmitInvalid: ({ formApi }) => {
      const invalid = FIELD_ORDER.find(
        (name) => formApi.getFieldMeta(name)?.errors.length,
      )
      if (invalid) focusField(invalid)
    },
    onSubmit: async ({ value, formApi }) => {
      if (!value.file) return
      setFormError(undefined)
      try {
        await onSubmit({
          file: value.file,
          type: value.type,
          takenOn: value.takenOn || undefined,
        })
      } catch (error) {
        if (!isApiError(error)) {
          setFormError(PHOTO_UNEXPECTED_ERROR)
          return
        }

        const fieldErrors = error.fieldErrors.filter(({ field }) =>
          isPhotoFieldName(field),
        )
        fieldErrors.forEach(({ field, message }) => {
          // onServer se limpia solo cuando el usuario vuelve a editar el campo
          formApi.setFieldMeta(field as PhotoFieldName, (meta) => ({
            ...meta,
            errorMap: { ...meta.errorMap, onServer: message },
          }))
        })

        // 413, 415, 403 o 503 (sin campo): aviso general del formulario
        if (
          fieldErrors.length === 0 ||
          fieldErrors.length < error.fieldErrors.length
        ) {
          setFormError(
            photoErrorMessage(error, {
              unavailable: PHOTO_UPLOAD_UNAVAILABLE,
              fallback: PHOTO_UNEXPECTED_ERROR,
            }),
          )
          return
        }
        const firstInvalid = FIELD_ORDER.find((name) =>
          fieldErrors.some(({ field }) => field === name),
        )
        if (firstInvalid) focusField(firstInvalid)
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
      className="flex flex-col gap-5"
      onSubmit={handleSubmit}
      aria-label="Subir una foto de progreso"
    >
      <form.Field name="type">
        {(field) => (
          <SegmentedControl
            legend="Tipo de foto"
            name={fieldId('type')}
            variant="chips"
            options={PROGRESS_PHOTO_TYPE_OPTIONS}
            value={field.state.value}
            onValueChange={(value) => field.handleChange(value)}
          />
        )}
      </form.Field>

      <form.Field
        name="file"
        validators={{
          // mientras se elige, solo se valida un archivo ya elegido
          onChange: ({ value }) =>
            value ? validatePhotoFile(value) : undefined,
          onSubmit: ({ value }) => validatePhotoFile(value),
        }}
      >
        {(field) => {
          const error = field.state.meta.errors[0] as string | undefined
          const file = field.state.value
          return (
            <FormField
              label="Foto"
              htmlFor={fieldId('file')}
              error={error}
              hint={FILE_HINT}
              required
            >
              <FileInput
                id={fieldId('file')}
                name="file"
                accept={ACCEPT}
                aria-required="true"
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy('file', error, FILE_HINT)}
                onChange={(event) =>
                  field.handleChange(event.target.files?.[0] ?? null)
                }
                onBlur={field.handleBlur}
              >
                {file
                  ? `${file.name} (${formatMegabytes(file.size)})`
                  : 'Elegí una foto de tu dispositivo'}
              </FileInput>
            </FormField>
          )
        }}
      </form.Field>

      <form.Field
        name="takenOn"
        validators={{
          onBlur: ({ value }) => validatePhotoTakenOn(value, today),
        }}
      >
        {(field) => {
          const error = field.state.meta.errors[0] as string | undefined
          return (
            <FormField
              label="Día de la foto"
              htmlFor={fieldId('takenOn')}
              error={error}
              hint={DATE_HINT}
            >
              <DateInput
                id={fieldId('takenOn')}
                name="takenOn"
                max={today}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy('takenOn', error, DATE_HINT)}
              />
            </FormField>
          )
        }}
      </form.Field>

      {formError && (
        <div ref={formErrorRef} tabIndex={-1} className="focus:outline-none">
          <Callout tone="danger">{formError}</Callout>
        </div>
      )}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <PrimaryButton type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Subiendo...' : 'Subir foto'}
          </PrimaryButton>
        )}
      </form.Subscribe>
    </form>
  )
}
