import { useId } from 'react'
import { formatWeight } from '../../../lib/routines'
import {
  formatDuration,
  type TrainingSession,
} from '../../../lib/training-sessions'
import { Card } from '../../../ui/card'
import { DescriptionItem, DescriptionList } from '../../../ui/description-list'

type TrainingSessionResultProps = {
  // una sesión finalizada: con endedAt y summary (US-20)
  session: TrainingSession
}

// resumen de un entrenamiento finalizado, de solo lectura: series hechas, omitidas, sin registrar,
// volumen y duración. Lo ve el atleta al terminar y cada vez que abre el detalle
export function TrainingSessionResult({ session }: TrainingSessionResultProps) {
  const titleId = useId()
  const { summary, startedAt, endedAt } = session

  return (
    <Card aria-labelledby={titleId} className="flex flex-col gap-5">
      <h2 id={titleId} className="text-lg font-semibold">
        Resumen
      </h2>
      <DescriptionList className="grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        <DescriptionItem label="Series hechas">
          {`${summary.doneSets} de ${summary.prescribedSets}`}
        </DescriptionItem>
        <DescriptionItem label="Omitidas">
          {summary.skippedSets}
        </DescriptionItem>
        <DescriptionItem label="Sin registrar">
          {summary.pendingSets}
        </DescriptionItem>
        <DescriptionItem label="Volumen">
          {formatWeight(summary.volumeKg)}
        </DescriptionItem>
        {endedAt && (
          <DescriptionItem label="Duración">
            {formatDuration(startedAt, endedAt)}
          </DescriptionItem>
        )}
      </DescriptionList>
    </Card>
  )
}
