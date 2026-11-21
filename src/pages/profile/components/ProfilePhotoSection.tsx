import { useForm } from '@tanstack/react-form'
import { useEffect, useRef, useState, type SubmitEventHandler } from 'react'
import {
  currentPhotoUrl,
  useDeleteOwnPhoto,
  useUploadOwnPhoto,
  type OwnProfile,
} from '../../../lib/profile'
import {
  formatMegabytes,
  PROGRESS_PHOTO_MAX_BYTES,
  validatePhotoFile,
} from '../../../lib/progress-photos'
import { Avatar } from '../../../ui/avatar'
import { DangerButton, GhostButton, PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { SectionCard } from '../../../ui/card'
import { ConfirmDialog } from '../../../ui/confirm-dialog'
import { FileInput } from '../../../ui/file-input'
import {
  FormField,
  getFieldErrorId,
  getFieldHintId,
} from '../../../ui/form-field'
import { ImagePlus } from '../../../ui/icons'
import {
  PHOTO_REMOVE_ERROR,
  PHOTO_REMOVED_MESSAGE,
  PHOTO_SAVED_MESSAGE,
} from '../messages'
import { distributeServerErrors } from '../server-errors'

const FILE_FIELD_ID = 'profile-photo-file'
const ACCEPT = 'image/jpeg,image/png,image/webp'
const FILE_HINT = `JPG, PNG o WebP, hasta ${formatMegabytes(PROGRESS_PHOTO_MAX_BYTES)}.`

type PhotoFormValues = { file: File | null }

type PhotoPreviewProps = {
  profile: OwnProfile
  // vista previa del archivo elegido (si es válido), o null para mostrar la foto actual
  previewUrl: string | null
  photoUrl: string | null
}

// lo que se ve arriba: la vista previa del archivo elegido o la foto actual. Sin foto, el avatar
// muestra las iniciales
function PhotoPreview({ profile, previewUrl, photoUrl }: PhotoPreviewProps) {
  const caption = previewUrl
    ? 'Así va a verse'
    : photoUrl
      ? 'Foto actual'
      : 'Sin foto: se ven tus iniciales'

  return (
    <div className="flex flex-col items-center gap-3 sm:items-start">
      <Avatar
        firstName={profile.firstName}
        lastName={profile.lastName}
        src={previewUrl ?? photoUrl ?? undefined}
        size="xl"
      />
      <p className="text-muted-foreground text-sm">{caption}</p>
    </div>
  )
}

// US-48: foto de perfil. Se elige, se ve la vista previa y se confirma con «Guardar foto» (eso
// reemplaza la anterior). Quitarla pide confirmación. La validación local es la de US-28
export function ProfilePhotoSection({ profile }: { profile: OwnProfile }) {
  const upload = useUploadOwnPhoto()
  const remove = useDeleteOwnPhoto()
  const [formError, setFormError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)
  // cambiar la clave vacía el input de archivo nativo (al guardar o al descartar)
  const [inputKey, setInputKey] = useState(0)
  // la URL de vista previa se crea al elegir el archivo (evento, no efecto) y se libera al
  // reemplazarla, al descartarla o al salir de la página
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const photoUrl = currentPhotoUrl(profile)

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    [],
  )

  const showPreview = (file: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const next =
      file && validatePhotoFile(file) === undefined
        ? URL.createObjectURL(file)
        : null
    previewUrlRef.current = next
    setPreviewUrl(next)
  }

  const form = useForm({
    defaultValues: { file: null } as PhotoFormValues,
    onSubmit: async ({ value, formApi }) => {
      if (!value.file) return
      setFormError(undefined)
      setNotice(undefined)
      const setFieldError = (_name: 'file', message: string) =>
        formApi.setFieldMeta('file', (meta) => ({
          ...meta,
          errorMap: { ...meta.errorMap, onServer: message },
        }))
      try {
        await upload.mutateAsync(value.file)
        formApi.reset()
        showPreview(null)
        setInputKey((key) => key + 1)
        setNotice(PHOTO_SAVED_MESSAGE)
      } catch (error) {
        setFormError(distributeServerErrors(error, ['file'], setFieldError))
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  const discard = () => {
    form.setFieldValue('file', null)
    showPreview(null)
    setInputKey((key) => key + 1)
    setFormError(undefined)
  }

  const confirmRemoval = async () => {
    setFormError(undefined)
    setNotice(undefined)
    try {
      await remove.mutateAsync()
      setNotice(PHOTO_REMOVED_MESSAGE)
    } catch {
      setFormError(PHOTO_REMOVE_ERROR)
    } finally {
      setConfirmingRemoval(false)
    }
  }

  return (
    <SectionCard title="Foto de perfil" icon={<ImagePlus />}>
      <PhotoPreview
        profile={profile}
        previewUrl={previewUrl}
        photoUrl={photoUrl}
      />

      <form
        noValidate
        aria-label="Foto de perfil"
        className="flex flex-col gap-5"
        onSubmit={handleSubmit}
      >
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
                label="Nueva foto"
                htmlFor={FILE_FIELD_ID}
                error={error}
                hint={FILE_HINT}
              >
                <FileInput
                  key={inputKey}
                  id={FILE_FIELD_ID}
                  name="file"
                  accept={ACCEPT}
                  aria-invalid={Boolean(error)}
                  aria-describedby={
                    error
                      ? getFieldErrorId(FILE_FIELD_ID)
                      : getFieldHintId(FILE_FIELD_ID)
                  }
                  onChange={(event) => {
                    const next = event.target.files?.[0] ?? null
                    field.handleChange(next)
                    showPreview(next)
                  }}
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

        {formError && <Callout tone="danger">{formError}</Callout>}

        <div className="flex flex-wrap items-center gap-3">
          <form.Subscribe selector={(state) => state.values.file}>
            {(file) =>
              file ? (
                <GhostButton onClick={discard} disabled={upload.isPending}>
                  Descartar
                </GhostButton>
              ) : null
            }
          </form.Subscribe>
          <PrimaryButton type="submit" disabled={upload.isPending}>
            {upload.isPending ? 'Guardando...' : 'Guardar foto'}
          </PrimaryButton>
          {notice && (
            <p role="status" className="text-success text-sm font-semibold">
              {notice}
            </p>
          )}
        </div>
      </form>

      <div className="border-border-subtle flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-muted-foreground text-sm">
          Quitarla te deja con las iniciales.
        </p>
        <DangerButton
          size="sm"
          disabled={!profile.photoUrl || remove.isPending}
          onClick={() => setConfirmingRemoval(true)}
        >
          Quitar foto
        </DangerButton>
      </div>

      <ConfirmDialog
        open={confirmingRemoval}
        title="¿Quitar tu foto de perfil?"
        description="Vas a ver tus iniciales en el menú y en tu perfil. Podés subir otra foto cuando quieras."
        confirmLabel="Quitar foto"
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => void confirmRemoval()}
        onCancel={() => setConfirmingRemoval(false)}
      />
    </SectionCard>
  )
}
