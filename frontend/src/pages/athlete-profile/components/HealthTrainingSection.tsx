import type { Athlete } from '../../../lib/athletes'
import { athleteEditPath } from '../../../router/paths'
import { SectionCard } from '../../../ui/card'
import { DescriptionItem, DescriptionList } from '../../../ui/description-list'
import { EmptyState } from '../../../ui/empty-state'
import { HeartPulse, NotebookPen } from '../../../ui/icons'
import { TextLink } from '../../../ui/text-link'
import {
  experienceLevelLabels,
  formatAvailableDays,
  formatHeightCm,
  presentText,
} from '../athlete-profile-format'
import { MissingValue } from './MissingValue'

type HealthTrainingSectionProps = { athlete: Athlete }

const TITLE = 'Salud y entrenamiento'

// texto libre de varias líneas (cargado en un textarea): conserva los saltos de línea
function LongText({ text }: { text: string | null }) {
  return text === null ? (
    <MissingValue />
  ) : (
    <span className="font-normal whitespace-pre-line">{text}</span>
  )
}

export function HealthTrainingSection({ athlete }: HealthTrainingSectionProps) {
  const { experienceLevel, heightCm, availableDays } = athlete
  const goal = presentText(athlete.goal)
  const injuries = presentText(athlete.injuries)
  const limitations = presentText(athlete.limitations)
  const isEmpty = [
    goal,
    experienceLevel,
    heightCm,
    availableDays,
    injuries,
    limitations,
  ].every((value) => value === null)

  return (
    <SectionCard title={TITLE} icon={<HeartPulse />} aria-label={TITLE}>
      {isEmpty ? (
        <EmptyState
          size="sm"
          icon={<NotebookPen />}
          title="Sin datos de salud y entrenamiento"
          description="Cargá su objetivo, nivel, lesiones y disponibilidad para planificar su entrenamiento."
          action={
            <TextLink to={athleteEditPath(athlete.id)}>
              Completar datos
            </TextLink>
          }
        />
      ) : (
        <DescriptionList>
          <DescriptionItem label="Objetivo">
            {goal ?? <MissingValue />}
          </DescriptionItem>
          <DescriptionItem label="Nivel de experiencia">
            {experienceLevel === null ? (
              <MissingValue />
            ) : (
              experienceLevelLabels[experienceLevel]
            )}
          </DescriptionItem>
          <DescriptionItem label="Altura">
            {heightCm === null ? <MissingValue /> : formatHeightCm(heightCm)}
          </DescriptionItem>
          <DescriptionItem label="Días disponibles">
            {availableDays === null ? (
              <MissingValue />
            ) : (
              formatAvailableDays(availableDays)
            )}
          </DescriptionItem>
          <DescriptionItem label="Lesiones" className="sm:col-span-2">
            <LongText text={injuries} />
          </DescriptionItem>
          <DescriptionItem label="Limitaciones" className="sm:col-span-2">
            <LongText text={limitations} />
          </DescriptionItem>
        </DescriptionList>
      )}
    </SectionCard>
  )
}
