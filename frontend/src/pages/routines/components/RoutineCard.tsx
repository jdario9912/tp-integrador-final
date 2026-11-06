import { useId } from 'react'
import {
  formatDaysPerWeek,
  formatDurationWeeks,
  type Routine,
} from '../../../lib/routines'
import { routineDetailPath } from '../../../router/paths'
import { Badge } from '../../../ui/badge'
import { Card } from '../../../ui/card'
import { IconChip } from '../../../ui/icon-chip'
import {
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Eye,
} from '../../../ui/icons'
import { InfoTile } from '../../../ui/info-tile'
import { TextLink } from '../../../ui/text-link'

type RoutineCardProps = { routine: Routine }

export function RoutineCard({ routine }: RoutineCardProps) {
  const titleId = useId()
  const { name, goal, description, daysPerWeek, durationWeeks, isTemplate } =
    routine

  return (
    <Card
      aria-labelledby={titleId}
      padding="sm"
      className="flex h-full flex-col gap-4 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <IconChip shape="square">
          <ClipboardList />
        </IconChip>
        <div className="flex min-w-0 flex-col gap-2">
          <h3 id={titleId} className="text-lg font-semibold break-words">
            {name}
          </h3>
          {(goal || isTemplate) && (
            <div className="flex flex-wrap gap-2">
              {goal && (
                <Badge
                  tone="primary"
                  variant="outline"
                  shape="pill"
                  className="max-w-full truncate"
                >
                  {goal}
                </Badge>
              )}
              {isTemplate && <Badge tone="info">Plantilla</Badge>}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InfoTile
          label="Frecuencia"
          icon={<CalendarCheck />}
          value={
            daysPerWeek === null
              ? 'Sin definir'
              : formatDaysPerWeek(daysPerWeek)
          }
        />
        <InfoTile
          label="Duración"
          icon={<CalendarDays />}
          value={
            durationWeeks === null
              ? 'Sin definir'
              : formatDurationWeeks(durationWeeks)
          }
        />
      </div>
      <p className="text-muted-foreground line-clamp-2 text-sm break-words">
        {description ?? 'Sin descripción'}
      </p>
      {/* mt-auto: en una fila de cards de distinto alto los links quedan alineados abajo */}
      <div className="mt-auto flex items-center">
        {/* el texto visible se repite en cada card: el nombre lo distingue para el lector */}
        <TextLink
          to={routineDetailPath(routine.id)}
          aria-label={`Ver rutina ${name}`}
          className="min-h-6"
        >
          <Eye aria-hidden="true" /> Ver rutina
        </TextLink>
      </div>
    </Card>
  )
}
