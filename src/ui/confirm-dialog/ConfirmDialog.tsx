import { useEffect, useId, useRef, type ReactNode } from 'react'
import { DangerButton, GhostButton, PrimaryButton } from '../button'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  // danger: la acción es destructiva (desvincular, desactivar)
  tone?: 'primary' | 'danger'
  // mientras confirma no se puede cerrar ni volver a confirmar
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// <dialog> nativo con showModal: atrapa el foco, bloquea el fondo y cierra con Escape
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const ConfirmButton = tone === 'danger' ? DangerButton : PrimaryButton

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
      aria-describedby={descriptionId}
      // Escape: el estado lo maneja el padre, no el navegador
      onCancel={(event) => {
        event.preventDefault()
        if (!isPending) onCancel()
      }}
      className="rounded-card shadow-card border-border-subtle bg-surface text-foreground m-auto w-[calc(100%-2rem)] max-w-md border p-6 backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-3">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <div id={descriptionId} className="text-muted-foreground text-sm">
          {description}
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <GhostButton onClick={onCancel} disabled={isPending}>
          Cancelar
        </GhostButton>
        <ConfirmButton onClick={onConfirm} disabled={isPending}>
          {isPending ? 'Procesando...' : confirmLabel}
        </ConfirmButton>
      </div>
    </dialog>
  )
}
