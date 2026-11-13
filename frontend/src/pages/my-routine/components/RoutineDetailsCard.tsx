import type { AssignedRoutine } from '../../../lib/athlete-routine'
import { formatIsoDate } from '../../../lib/iso-date'
import { formatDaysPerWeek, formatDurationWeeks } from '../../../lib/routines'
import { SectionCard } from '../../../ui/card'
import { DescriptionItem, DescriptionList } from '../../../ui/description-list'
import { ClipboardList } from '../../../ui/icons'

type RoutineDetailsCardProps = {
  routine: AssignedRoutine
  // YYYY-MM-DD
  assignmentDate: string
  className?: string
}

// el resto de los datos de la rutina; los opcionales sin cargar no se muestran
export function RoutineDetailsCard({
  routine,
  assignmentDate,
  className,
}: RoutineDetailsCardProps) {
  return (
    <SectionCard
      title="Sobre la rutina"
      icon={<ClipboardList />}
      className={className}
    >
      {routine.description && (
        <p className="text-[15px] break-words whitespace-pre-line">
          {routine.description}
        </p>
      )}
      <DescriptionList className="lg:grid-cols-1">
        {routine.daysPerWeek !== null && (
          <DescriptionItem label="Frecuencia">
            {formatDaysPerWeek(routine.daysPerWeek)}
          </DescriptionItem>
        )}
        {routine.durationWeeks !== null && (
          <DescriptionItem label="Duración">
            {formatDurationWeeks(routine.durationWeeks)}
          </DescriptionItem>
        )}
        <DescriptionItem label="Asignada el">
          {formatIsoDate(assignmentDate)}
        </DescriptionItem>
      </DescriptionList>
    </SectionCard>
  )
}
