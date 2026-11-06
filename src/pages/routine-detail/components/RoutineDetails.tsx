import {
  formatDaysPerWeek,
  formatDurationWeeks,
  type Routine,
} from '../../../lib/routines'
import { SectionCard } from '../../../ui/card'
import { DescriptionItem, DescriptionList } from '../../../ui/description-list'
import { ClipboardList } from '../../../ui/icons'

type RoutineDetailsProps = { routine: Routine }

// datos generales en modo lectura; los días y ejercicios llegan con US-14
export function RoutineDetails({ routine }: RoutineDetailsProps) {
  const { goal, daysPerWeek, durationWeeks, isTemplate, description } = routine

  return (
    <SectionCard title="Datos de la rutina" icon={<ClipboardList />}>
      <DescriptionList>
        <DescriptionItem label="Objetivo">
          {goal ?? 'Sin objetivo'}
        </DescriptionItem>
        <DescriptionItem label="Plantilla">
          {isTemplate ? 'Sí' : 'No'}
        </DescriptionItem>
        <DescriptionItem label="Días por semana">
          {daysPerWeek === null
            ? 'Sin definir'
            : formatDaysPerWeek(daysPerWeek)}
        </DescriptionItem>
        <DescriptionItem label="Duración">
          {durationWeeks === null
            ? 'Sin definir'
            : formatDurationWeeks(durationWeeks)}
        </DescriptionItem>
        <DescriptionItem label="Descripción" className="sm:col-span-2">
          {description ?? 'Sin descripción'}
        </DescriptionItem>
      </DescriptionList>
    </SectionCard>
  )
}
