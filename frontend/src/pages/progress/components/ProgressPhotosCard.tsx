import { useMemo, useState } from 'react'
import { isApiError } from '../../../lib/api'
import { formatIsoDate } from '../../../lib/iso-date'
import {
  progressPhotoTypeLabel,
  useDeleteProgressPhoto,
  useProgressPhotos,
  useUploadProgressPhoto,
  type ProgressPhoto,
  type ProgressPhotoUploadInput,
} from '../../../lib/progress-photos'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { ConfirmDialog } from '../../../ui/confirm-dialog'
import { IconChip } from '../../../ui/icon-chip'
import { ImagePlus } from '../../../ui/icons'
import {
  PHOTO_ALREADY_GONE,
  PHOTO_DELETE_UNAVAILABLE,
  PHOTO_UNEXPECTED_ERROR,
  photoErrorMessage,
} from '../photo-messages'
import { PHOTOS_HEADING_ID, PHOTOS_NOTICE_ID } from '../photo-element-ids'
import { usePendingFocus } from '../hooks/use-pending-focus'
import { PhotoUploadForm } from './PhotoUploadForm'
import { ProgressPhotoGrid } from './ProgressPhotoGrid'
import { ProgressPhotoViewer } from './ProgressPhotoViewer'

type ProgressPhotosCardProps = {
  athleteId: string
  // hoy en la zona de la app
  today: string
  // US-30: el entrenador solo mira la galería; subir y borrar son del atleta (el backend da 403)
  readOnly?: boolean
}

// sección de fotos de progreso del atleta (US-28): subir, ver en grande y borrar.
// En solo lectura queda la galería con su visor (vista del entrenador, US-30)
export function ProgressPhotosCard({
  athleteId,
  today,
  readOnly = false,
}: ProgressPhotosCardProps) {
  const photos = useProgressPhotos(athleteId)
  const upload = useUploadProgressPhoto(athleteId)
  const remove = useDeleteProgressPhoto(athleteId)
  const requestFocus = usePendingFocus()

  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  // el formulario se vuelve a montar después de subir: arranca limpio
  const [formVersion, setFormVersion] = useState(0)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ProgressPhoto | null>(null)

  // las páginas se suman en orden: la lista ya llega cronológica
  const items = useMemo(
    () => photos.data?.pages.flatMap((page) => page.content) ?? [],
    [photos.data],
  )
  const total = photos.data?.pages[0]?.totalElements ?? 0
  const viewingIndex = items.findIndex(({ id }) => id === viewingId)
  const viewing = viewingIndex >= 0 ? items[viewingIndex] : undefined

  const describe = (photo: ProgressPhoto) =>
    `${progressPhotoTypeLabel(photo.type)} del ${formatIsoDate(photo.takenOn)}`

  // el error de subida vuelve al formulario (lo muestra él): por eso se relanza
  const handleUpload = async (input: ProgressPhotoUploadInput) => {
    setNotice(null)
    setActionError(null)
    const photo = await upload.mutateAsync(input)
    setFormVersion((version) => version + 1)
    setNotice(`Subiste la foto ${describe(photo)}.`)
    requestFocus(PHOTOS_NOTICE_ID)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const deleted = pendingDelete
    setNotice(null)
    setActionError(null)
    try {
      await remove.mutateAsync(deleted.id)
      setPendingDelete(null)
      setNotice(`Borraste la foto ${describe(deleted)}.`)
      requestFocus(PHOTOS_NOTICE_ID)
    } catch (error) {
      setPendingDelete(null)
      setActionError(
        isApiError(error) && error.status === 404
          ? PHOTO_ALREADY_GONE
          : photoErrorMessage(error, {
              unavailable: PHOTO_DELETE_UNAVAILABLE,
              fallback: PHOTO_UNEXPECTED_ERROR,
            }),
      )
      requestFocus(PHOTOS_HEADING_ID)
    }
  }

  // al borrar desde el visor, el visor se cierra y se pide confirmación
  const askDelete = () => {
    if (!viewing) return
    setPendingDelete(viewing)
    setViewingId(null)
  }

  return (
    <Card aria-labelledby={PHOTOS_HEADING_ID} className="flex flex-col gap-6">
      <div className="border-border-subtle flex items-start gap-3 border-b pb-4">
        <IconChip shape="square" size="sm">
          <ImagePlus />
        </IconChip>
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id={PHOTOS_HEADING_ID}
            tabIndex={-1}
            className="text-lg font-semibold focus:outline-none sm:text-xl"
          >
            Fotos de progreso
          </h2>
          <p className="text-muted-foreground text-sm">
            {readOnly
              ? 'Frontal, lateral y espalda, en orden de fecha. Las sube el atleta desde su perfil.'
              : 'Frontal, lateral y espalda, en orden de fecha. Solo vos y tu entrenador las pueden ver.'}
          </p>
        </div>
      </div>

      {notice && (
        <div id={PHOTOS_NOTICE_ID} tabIndex={-1} className="focus:outline-none">
          <Callout tone="success" role="status">
            {notice}
          </Callout>
        </div>
      )}
      {actionError && <Callout tone="danger">{actionError}</Callout>}

      {/* sin el formulario, la galería ocupa todo el ancho */}
      <div
        className={
          readOnly
            ? 'flex flex-col'
            : 'grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
        }
      >
        {!readOnly && (
          <div className="border-border-subtle bg-background rounded-card border p-4 sm:p-5">
            <h3 className="mb-4 text-base font-semibold">Subir una foto</h3>
            <PhotoUploadForm
              key={formVersion}
              today={today}
              onSubmit={handleUpload}
            />
          </div>
        )}

        <ProgressPhotoGrid
          athleteId={athleteId}
          photos={photos.data ? items : undefined}
          isPending={photos.isPending}
          error={photos.error}
          onRetry={() => void photos.refetch()}
          hasNextPage={photos.hasNextPage}
          isFetchingNextPage={photos.isFetchingNextPage}
          onLoadMore={() => void photos.fetchNextPage()}
          onOpen={(photo) => setViewingId(photo.id)}
          readOnly={readOnly}
        />
      </div>

      <ProgressPhotoViewer
        athleteId={athleteId}
        photo={viewing ?? null}
        position={viewingIndex + 1}
        total={total}
        hasPrevious={viewingIndex > 0}
        hasNext={viewingIndex >= 0 && viewingIndex < items.length - 1}
        onPrevious={() => setViewingId(items[viewingIndex - 1]?.id ?? null)}
        onNext={() => setViewingId(items[viewingIndex + 1]?.id ?? null)}
        onDelete={readOnly ? undefined : askDelete}
        onClose={() => setViewingId(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="¿Borrar esta foto?"
        description={
          pendingDelete
            ? `Se borra la foto ${describe(pendingDelete)}. No se puede deshacer.`
            : ''
        }
        confirmLabel="Borrar foto"
        tone="danger"
        isPending={remove.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </Card>
  )
}
