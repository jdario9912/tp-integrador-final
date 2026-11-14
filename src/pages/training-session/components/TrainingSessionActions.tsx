import { useState } from 'react'
import { isApiError } from '../../../lib/api'
import {
  useCancelTrainingSession,
  useFinishTrainingSession,
  type TrainingSession,
} from '../../../lib/training-sessions'
import { ConfirmDialog } from '../../../ui/confirm-dialog'
import { Callout } from '../../../ui/callout'
import { OutlineButton, PrimaryButton } from '../../../ui/button'
import { cancelPrompt, finishPrompt, progressText } from '../end-session-copy'

type TrainingSessionActionsProps = {
  athleteId: string
  // la sesión en curso: de ella salen el resumen de la confirmación y los ids de la mutación
  session: TrainingSession
}

// qué confirmación está abierta: una a la vez
type OpenDialog = 'finish' | 'cancel' | null

// finalizar y cancelar la sesión en curso (US-20). Van arriba de los ejercicios, en el slot de
// acción del día. Cada una pide confirmación; la de finalizar sin series hechas sugiere cancelar
export function TrainingSessionActions({
  athleteId,
  session,
}: TrainingSessionActionsProps) {
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const finish = useFinishTrainingSession(athleteId, session.id)
  const cancel = useCancelTrainingSession(athleteId, session.id)
  const busy = finish.isPending || cancel.isPending
  const failure = finish.error ?? cancel.error
  const prompt = finishPrompt(session.summary)

  // abrir una confirmación limpia el error de un intento anterior
  const open = (next: Exclude<OpenDialog, null>) => {
    finish.reset()
    cancel.reset()
    setDialog(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        {progressText(session.summary)}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <PrimaryButton
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={() => open('finish')}
        >
          Finalizar entrenamiento
        </PrimaryButton>
        <OutlineButton
          className="border-danger text-danger hover:bg-danger-soft w-full sm:w-auto"
          disabled={busy}
          onClick={() => open('cancel')}
        >
          Cancelar entrenamiento
        </OutlineButton>
      </div>

      {failure && (
        <Callout tone="danger">
          {isApiError(failure)
            ? failure.message
            : 'Ocurrió un error inesperado. Intentá nuevamente.'}
        </Callout>
      )}

      <ConfirmDialog
        open={dialog === 'finish'}
        title={prompt.title}
        description={
          <>
            <p>{prompt.description}</p>
            {prompt.withoutDoneSets && (
              <OutlineButton
                size="sm"
                className="mt-3"
                onClick={() => open('cancel')}
              >
                Cancelarlo en su lugar
              </OutlineButton>
            )}
          </>
        }
        confirmLabel="Sí, finalizar"
        isPending={finish.isPending}
        onConfirm={() => {
          finish.mutate(undefined, { onSettled: () => setDialog(null) })
        }}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === 'cancel'}
        title={cancelPrompt.title}
        description={cancelPrompt.description}
        confirmLabel="Sí, cancelar"
        tone="danger"
        isPending={cancel.isPending}
        onConfirm={() => {
          cancel.mutate(undefined, { onSettled: () => setDialog(null) })
        }}
        onCancel={() => setDialog(null)}
      />
    </div>
  )
}
