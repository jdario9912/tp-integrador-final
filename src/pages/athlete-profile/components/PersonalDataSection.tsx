import type { Athlete } from '../../../lib/athletes'
import { Badge } from '../../../ui/badge'
import { SectionCard } from '../../../ui/card'
import { DescriptionItem, DescriptionList } from '../../../ui/description-list'
import { IdCard } from '../../../ui/icons'
import { athleteStatusView } from '../../athletes/athlete-status'
import {
  ageFromBirthDate,
  formatAge,
  formatIsoDate,
  presentText,
  sexLabels,
} from '../athlete-profile-format'
import { MissingValue } from './MissingValue'

type PersonalDataSectionProps = { athlete: Athlete }

const TITLE = 'Datos personales'

// nombre, email, estado y cuenta siempre vienen: la sección nunca queda vacía
export function PersonalDataSection({ athlete }: PersonalDataSectionProps) {
  const { firstName, lastName, email, sex, birthDate, startDate, active } =
    athlete
  const phone = presentText(athlete.phone)
  const statusView = athleteStatusView[athlete.status]

  return (
    <SectionCard title={TITLE} icon={<IdCard />} aria-label={TITLE}>
      <DescriptionList>
        <DescriptionItem label="Nombre">
          {firstName} {lastName}
        </DescriptionItem>
        <DescriptionItem label="Email">{email}</DescriptionItem>
        <DescriptionItem label="Teléfono">
          {phone ?? <MissingValue />}
        </DescriptionItem>
        <DescriptionItem label="Sexo">
          {sex === null ? <MissingValue /> : sexLabels[sex]}
        </DescriptionItem>
        <DescriptionItem label="Fecha de nacimiento">
          {birthDate === null ? (
            <MissingValue />
          ) : (
            <>
              <time dateTime={birthDate}>{formatIsoDate(birthDate)}</time>{' '}
              <span className="text-muted-foreground font-normal">
                ({formatAge(ageFromBirthDate(birthDate))})
              </span>
            </>
          )}
        </DescriptionItem>
        <DescriptionItem label="Fecha de inicio">
          {startDate === null ? (
            <MissingValue />
          ) : (
            <time dateTime={startDate}>{formatIsoDate(startDate)}</time>
          )}
        </DescriptionItem>
        <DescriptionItem label="Estado">
          <Badge tone={statusView.tone} dot>
            {statusView.label}
          </Badge>
        </DescriptionItem>
        <DescriptionItem label="Cuenta">
          <Badge tone={active ? 'success' : 'neutral'} dot>
            {active ? 'Activa' : 'Desactivada'}
          </Badge>
        </DescriptionItem>
      </DescriptionList>
    </SectionCard>
  )
}
