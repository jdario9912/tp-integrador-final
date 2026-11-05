import { useId } from 'react'
import type { Exercise } from '../../../lib/exercises'
import { exerciseEditPath } from '../../../router/paths'
import { Badge } from '../../../ui/badge'
import { Card } from '../../../ui/card'
import { IconChip } from '../../../ui/icon-chip'
import { Dumbbell, Pencil, PlayCircle } from '../../../ui/icons'
import { TextLink } from '../../../ui/text-link'

type ExerciseCardProps = {
  exercise: Exercise
  // nombre del grupo muscular ya resuelto ("Pecho")
  muscleGroupName: string
}

const linkClasses =
  'text-primary hover:text-primary-hover focus-visible:ring-ring inline-flex min-h-6 items-center gap-1.5 rounded-sm text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none [&_svg]:size-4'

export function ExerciseCard({ exercise, muscleGroupName }: ExerciseCardProps) {
  const titleId = useId()
  const { name, description, videoUrl, global } = exercise

  return (
    <Card
      aria-labelledby={titleId}
      padding="sm"
      className="flex h-full flex-col gap-4 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <IconChip shape="square">
          <Dumbbell />
        </IconChip>
        <div className="flex min-w-0 flex-col gap-2">
          <h3 id={titleId} className="text-lg font-semibold break-words">
            {name}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Badge tone="primary" variant="outline" shape="pill">
              {muscleGroupName}
            </Badge>
            {/* global: del sistema, lo ven todos los entrenadores y no se edita */}
            <Badge tone={global ? 'neutral' : 'info'}>
              {global ? 'Global' : 'Mío'}
            </Badge>
          </div>
        </div>
      </div>
      <p className="text-muted-foreground line-clamp-2 text-sm break-words">
        {description ?? 'Sin descripción'}
      </p>
      {(videoUrl || !global) && (
        // mt-auto: en una fila de cards de distinto alto los links quedan alineados abajo
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {videoUrl && (
            // link externo: se abre en otra pestaña sin darle acceso a la app
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ver video de ${name} (se abre en otra pestaña)`}
              className={linkClasses}
            >
              <PlayCircle aria-hidden="true" /> Ver video
            </a>
          )}
          {!global && (
            <TextLink
              to={exerciseEditPath(exercise.id)}
              aria-label={`Editar ${name}`}
              className="text-muted-foreground hover:text-primary ml-auto min-h-6"
            >
              <Pencil aria-hidden="true" /> Editar
            </TextLink>
          )}
        </div>
      )}
    </Card>
  )
}
