import { useState } from 'react'
import { DangerButton } from '../../../ui/button'
import { SectionCard } from '../../../ui/card'
import { ConfirmDialog } from '../../../ui/confirm-dialog'
import { Trash2 } from '../../../ui/icons'

type DeleteExerciseCardProps = {
  exerciseName: string
  // el diálogo se cierra cuando la promesa termina, salga bien o mal: el error lo muestra la página
  onDelete: () => Promise<unknown>
  isDeleting?: boolean
}

export function DeleteExerciseCard({
  exerciseName,
  onDelete,
  isDeleting = false,
}: DeleteExerciseCardProps) {
  const [confirming, setConfirming] = useState(false)

  const confirm = async () => {
    try {
      await onDelete()
    } catch {
      // lo muestra la página con el error de la mutación
    }
    setConfirming(false)
  }

  return (
    <SectionCard title="Eliminar ejercicio" icon={<Trash2 />}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Deja de aparecer en tu catálogo. Las rutinas que ya lo usan no se
          modifican.
        </p>
        <DangerButton
          size="sm"
          disabled={isDeleting}
          onClick={() => setConfirming(true)}
        >
          <Trash2 aria-hidden="true" /> Eliminar
        </DangerButton>
      </div>
      <ConfirmDialog
        open={confirming}
        title={`¿Eliminar ${exerciseName}?`}
        description="Deja de aparecer en tu catálogo. Las rutinas que ya lo usan no se modifican."
        confirmLabel="Eliminar"
        tone="danger"
        isPending={isDeleting}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(false)}
      />
    </SectionCard>
  )
}
