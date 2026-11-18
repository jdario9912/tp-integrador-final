import { useEffect, useId, useRef } from 'react'
import { formatIsoDate } from '../../../lib/iso-date'
import {
  progressPhotoTypeLabel,
  type ProgressPhoto,
} from '../../../lib/progress-photos'
import { DangerButton, GhostButton, OutlineButton } from '../../../ui/button'
import { ChevronLeft, ChevronRight, X } from '../../../ui/icons'
import { ProgressPhotoImage } from './ProgressPhotoImage'

type ProgressPhotoViewerProps = {
  athleteId: string
  // null: el visor está cerrado
  photo: ProgressPhoto | null
  // posición de la foto en el listado cronológico (1 = la más antigua) y total de fotos
  position: number
  total: number
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  // sin onDelete el visor es de solo lectura (vista del entrenador, US-30)
  onDelete?: () => void
  // Escape, el botón Cerrar o un cierre del navegador: el padre actualiza su estado
  onClose: () => void
}

// visor en grande como <dialog> nativo: atrapa el foco, cierra con Escape y bloquea el fondo
export function ProgressPhotoViewer({
  athleteId,
  photo,
  position,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onDelete,
  onClose,
}: ProgressPhotoViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const open = photo !== null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="rounded-card shadow-card border-border-subtle bg-surface text-foreground m-auto w-[calc(100%-1.5rem)] max-w-3xl border p-4 backdrop:bg-inverse/60 sm:p-6"
    >
      {photo && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-lg font-semibold">
              {`${progressPhotoTypeLabel(photo.type)}, ${formatIsoDate(photo.takenOn)}`}
            </h2>
            <GhostButton size="sm" onClick={onClose}>
              <X aria-hidden="true" />
              Cerrar
            </GhostButton>
          </div>

          {/* key: cada foto es otra imagen, así no se arrastra el estado de renovación */}
          <div className="bg-secondary rounded-control flex max-h-[70vh] min-h-64 items-center justify-center overflow-hidden">
            <ProgressPhotoImage
              key={photo.id}
              athleteId={athleteId}
              photo={photo}
              alt={`Foto ${progressPhotoTypeLabel(photo.type)} del ${formatIsoDate(photo.takenOn)}`}
              loading="eager"
              className="object-contain"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {`Foto ${position} de ${total}`}
            </p>
            <div className="flex flex-wrap gap-3">
              <OutlineButton
                size="sm"
                onClick={onPrevious}
                disabled={!hasPrevious}
              >
                <ChevronLeft aria-hidden="true" />
                Anterior
              </OutlineButton>
              <OutlineButton size="sm" onClick={onNext} disabled={!hasNext}>
                Siguiente
                <ChevronRight aria-hidden="true" />
              </OutlineButton>
              {onDelete && (
                <DangerButton size="sm" onClick={onDelete}>
                  Borrar foto
                </DangerButton>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}
