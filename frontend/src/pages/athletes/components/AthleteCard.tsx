import { Pencil, Target, Weight } from 'lucide-react'
import { useId } from 'react'
import type { Athlete } from '../../../lib/athletes'
import { athleteEditPath } from '../../../router/paths'
import { Avatar } from '../../../ui/avatar'
import { Badge } from '../../../ui/badge'
import { Card } from '../../../ui/card'
import { InfoTile } from '../../../ui/info-tile'
import { TextLink } from '../../../ui/text-link'
import { athleteStatusView } from '../athlete-status'

const weightFormat = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
})

type AthleteCardProps = { athlete: Athlete }

export function AthleteCard({ athlete }: AthleteCardProps) {
  const titleId = useId()
  const { firstName, lastName, goal, initialWeightKg, status } = athlete
  const statusView = athleteStatusView[status]

  return (
    <Card
      aria-labelledby={titleId}
      padding="sm"
      // requiere revisión: borde de alerta, como en la plantilla
      tone={status === 'NEEDS_REVIEW' ? 'danger' : 'default'}
      className="flex h-full flex-col gap-4.5 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-center gap-3">
        <Avatar
          firstName={firstName}
          lastName={lastName}
          size="lg"
          tone={statusView.tone === 'danger' ? 'danger' : 'primary'}
          status={statusView.avatar}
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={titleId} className="text-lg font-semibold break-words">
            {firstName} {lastName}
          </h3>
          <Badge tone={statusView.tone}>{statusView.label}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InfoTile
          label="Objetivo"
          icon={<Target />}
          value={goal ?? 'Sin objetivo'}
          className="break-words"
        />
        <InfoTile
          label="Peso"
          icon={<Weight />}
          value={
            initialWeightKg === null
              ? '—'
              : `${weightFormat.format(initialWeightKg)} kg`
          }
        />
      </div>
      {/* mt-auto: en una fila de cards de distinto alto el link queda alineado abajo */}
      <TextLink
        to={athleteEditPath(athlete.id)}
        // el texto visible se repite en cada card: el nombre lo distingue para el lector
        aria-label={`Editar a ${firstName} ${lastName}`}
        className="mt-auto self-end"
      >
        <Pencil aria-hidden="true" /> Editar
      </TextLink>
    </Card>
  )
}
