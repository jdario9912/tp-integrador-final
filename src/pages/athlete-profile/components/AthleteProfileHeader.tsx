import { CalendarDays, Pencil, Target } from 'lucide-react'
import type { Athlete } from '../../../lib/athletes'
import { Avatar } from '../../../ui/avatar'
import { Badge } from '../../../ui/badge'
import { PrimaryButton } from '../../../ui/button'
import { Card } from '../../../ui/card'
import { athleteStatusView } from '../../athletes/athlete-status'
import { formatIsoDate, presentText } from '../athlete-profile-format'

type AthleteProfileHeaderProps = {
  athlete: Athlete
  onEdit: () => void
}

const metaIconClasses = 'text-primary size-4.5 shrink-0'

// identidad y situación de un vistazo, como la cabecera del perfil de la plantilla
export function AthleteProfileHeader({
  athlete,
  onEdit,
}: AthleteProfileHeaderProps) {
  const { firstName, lastName, status, active, startDate } = athlete
  const goal = presentText(athlete.goal)
  const statusView = athleteStatusView[status]

  return (
    <Card className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
      {/* sin punto de estado: el badge ya lo dice y el lector no lo repite */}
      <Avatar
        firstName={firstName}
        lastName={lastName}
        size="xl"
        tone={statusView.tone === 'danger' ? 'danger' : 'primary'}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
          <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
            {firstName} {lastName}
          </h1>
          <Badge
            tone={statusView.tone}
            shape="pill"
            dot
            className="self-center"
          >
            {statusView.label}
          </Badge>
          {/* estado y cuenta son datos distintos: un atleta desactivado sigue con su estado */}
          {active ? null : (
            <Badge tone="neutral" shape="pill" className="self-center">
              Cuenta desactivada
            </Badge>
          )}
        </div>
        {goal !== null || startDate !== null ? (
          <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1.5 text-[15px]">
            {goal === null ? null : (
              <li className="flex min-w-0 items-center gap-1.5 break-words">
                <Target aria-hidden="true" className={metaIconClasses} />
                Objetivo: {goal}
              </li>
            )}
            {startDate === null ? null : (
              <li className="flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" className={metaIconClasses} />
                Inicio:{' '}
                <time dateTime={startDate}>{formatIsoDate(startDate)}</time>
              </li>
            )}
          </ul>
        ) : null}
      </div>
      <PrimaryButton onClick={onEdit} className="self-start sm:self-center">
        <Pencil aria-hidden="true" /> Editar datos
      </PrimaryButton>
    </Card>
  )
}
