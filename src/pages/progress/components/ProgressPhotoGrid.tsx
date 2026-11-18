import { formatIsoDate } from '../../../lib/iso-date'
import {
  progressPhotoTypeLabel,
  type ProgressPhoto,
} from '../../../lib/progress-photos'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { EmptyState } from '../../../ui/empty-state'
import { ImagePlus, RotateCw } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import {
  ATHLETE_PHOTO_LIST_UNAVAILABLE,
  PHOTO_LIST_UNAVAILABLE,
  PHOTO_UNEXPECTED_ERROR,
  photoErrorMessage,
} from '../photo-messages'
import { PHOTOS_FILE_FIELD_ID, PHOTOS_HEADING_ID } from '../photo-element-ids'
import { ProgressPhotoImage } from './ProgressPhotoImage'

type ProgressPhotoGridProps = {
  athleteId: string
  // undefined mientras carga la primera página
  photos: ProgressPhoto[] | undefined
  isPending: boolean
  error: unknown
  onRetry: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  onOpen: (photo: ProgressPhoto) => void
  // vista del entrenador (US-30): los textos hablan del atleta y no se ofrece subir
  readOnly?: boolean
}

const SKELETON_TILES = 3

const focusUploadField = () =>
  document.getElementById(PHOTOS_FILE_FIELD_ID)?.focus()

// miniaturas en orden cronológico (la más antigua primero), como una línea de tiempo
export function ProgressPhotoGrid({
  athleteId,
  photos,
  isPending,
  error,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onOpen,
  readOnly = false,
}: ProgressPhotoGridProps) {
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Callout tone="danger" className="self-stretch">
          {photoErrorMessage(error, {
            unavailable: readOnly
              ? ATHLETE_PHOTO_LIST_UNAVAILABLE
              : PHOTO_LIST_UNAVAILABLE,
            fallback: PHOTO_UNEXPECTED_ERROR,
          })}
        </Callout>
        <OutlineButton size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Reintentar
        </OutlineButton>
      </div>
    )
  }

  if (isPending || !photos) {
    return (
      <div
        role="status"
        aria-label="Cargando fotos de progreso"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {Array.from({ length: SKELETON_TILES }, (_, index) => (
          <Skeleton
            key={index}
            className="aspect-[3/4] w-full motion-reduce:animate-none"
          />
        ))}
      </div>
    )
  }

  if (photos.length === 0) {
    if (readOnly) {
      return (
        <EmptyState
          size="sm"
          icon={<ImagePlus />}
          title="El atleta todavía no subió fotos de progreso"
          description="Cuando suba sus fotos frontal, lateral o de espalda, vas a verlas acá en orden de fecha."
        />
      )
    }
    return (
      <EmptyState
        size="sm"
        icon={<ImagePlus />}
        title="Todavía no subiste fotos de progreso"
        description="Subí una foto frontal, lateral o de espalda: con el tiempo vas a ver tu evolución acá."
        // US-29: acceso directo al formulario de subida (enfoca el selector de archivo)
        action={
          <OutlineButton size="sm" onClick={focusUploadField}>
            Subir mi primera foto
          </OutlineButton>
        }
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <ol
        aria-labelledby={PHOTOS_HEADING_ID}
        className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
      >
        {photos.map((photo) => {
          const label = `${progressPhotoTypeLabel(photo.type)} del ${formatIsoDate(photo.takenOn)}`
          return (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => onOpen(photo)}
                aria-label={`Ver la foto ${label}`}
                className="focus-visible:ring-ring group flex w-full flex-col gap-2 rounded-control text-left focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="bg-secondary rounded-control block aspect-[3/4] w-full overflow-hidden transition-transform group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                  <ProgressPhotoImage athleteId={athleteId} photo={photo} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {progressPhotoTypeLabel(photo.type)}
                  </span>
                  <time
                    dateTime={photo.takenOn}
                    className="text-muted-foreground text-xs"
                  >
                    {formatIsoDate(photo.takenOn)}
                  </time>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      {hasNextPage && (
        <OutlineButton onClick={onLoadMore} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Cargando...' : 'Cargar más fotos'}
        </OutlineButton>
      )}
    </div>
  )
}
