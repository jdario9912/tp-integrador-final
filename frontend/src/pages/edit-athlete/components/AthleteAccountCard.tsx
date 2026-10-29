import { UserCog, UserMinus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../../ui/badge'
import { DangerButton, OutlineButton } from '../../../ui/button'
import { SectionCard } from '../../../ui/card'
import { ConfirmDialog } from '../../../ui/confirm-dialog'

type AthleteAccountCardProps = {
  athleteName: string
  active: boolean
  // sin handler la acción queda deshabilitada. El diálogo de confirmación se cierra cuando
  // la promesa termina, salga bien o mal: el error lo muestra la página
  onToggleActive?: () => Promise<unknown>
  onUnlink?: () => Promise<unknown>
  isTogglingActive?: boolean
  isUnlinking?: boolean
}

type PendingAction = 'deactivate' | 'unlink'

// reactivar no pide confirmación: no le quita nada al atleta
export function AthleteAccountCard({
  athleteName,
  active,
  onToggleActive,
  onUnlink,
  isTogglingActive = false,
  isUnlinking = false,
}: AthleteAccountCardProps) {
  const [confirming, setConfirming] = useState<PendingAction>()

  const run = async (action?: () => Promise<unknown>) => {
    try {
      await action?.()
    } catch {
      // lo muestra la página con el error de la mutación
    }
  }

  const confirm = async () => {
    await run(confirming === 'unlink' ? onUnlink : onToggleActive)
    setConfirming(undefined)
  }

  return (
    <SectionCard title="Cuenta del atleta" icon={<UserCog />}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Acceso a la aplicación</span>
              <Badge tone={active ? 'success' : 'neutral'} dot>
                {active ? 'Activa' : 'Desactivada'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {active
                ? 'Si la desactivás, no va a poder iniciar sesión hasta que la reactives.'
                : 'No puede iniciar sesión hasta que reactives su cuenta.'}
            </p>
          </div>
          <OutlineButton
            size="sm"
            disabled={!onToggleActive || isTogglingActive}
            onClick={() =>
              active ? setConfirming('deactivate') : void run(onToggleActive)
            }
          >
            {active ? 'Desactivar cuenta' : 'Reactivar cuenta'}
          </OutlineButton>
        </div>

        <div className="border-border-subtle flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Desvincular atleta</span>
            <p className="text-muted-foreground text-sm">
              Deja de aparecer en tu listado.
            </p>
          </div>
          <DangerButton
            size="sm"
            disabled={!onUnlink || isUnlinking}
            onClick={() => setConfirming('unlink')}
          >
            <UserMinus aria-hidden="true" /> Desvincular
          </DangerButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirming === 'deactivate'}
        title={`¿Desactivar la cuenta de ${athleteName}?`}
        description="No va a poder iniciar sesión hasta que la reactives. Sus datos no se modifican."
        confirmLabel="Desactivar"
        tone="danger"
        isPending={isTogglingActive}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(undefined)}
      />
      <ConfirmDialog
        open={confirming === 'unlink'}
        title={`¿Desvincular a ${athleteName}?`}
        description="Deja de aparecer en tu listado y ya no vas a poder gestionarlo."
        confirmLabel="Desvincular"
        tone="danger"
        isPending={isUnlinking}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(undefined)}
      />
    </SectionCard>
  )
}
