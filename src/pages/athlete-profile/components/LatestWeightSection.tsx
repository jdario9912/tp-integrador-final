import { Scale, Weight } from 'lucide-react'
import { athleteEditPath } from '../../../router/paths'
import { SectionCard } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { TextLink } from '../../../ui/text-link'
import { formatWeightKg } from '../athlete-profile-format'

type LatestWeightSectionProps = {
  athleteId: string
  initialWeightKg: number | null
}

const TITLE = 'Último peso'

// hasta que existan los registros de peso (US-26) el último peso es el inicial, rotulado como tal.
// US-26 conecta acá su hook y deja el peso inicial solo para cuando no haya registros
export function LatestWeightSection({
  athleteId,
  initialWeightKg,
}: LatestWeightSectionProps) {
  return (
    <SectionCard title={TITLE} icon={<Scale />} aria-label={TITLE}>
      {initialWeightKg === null ? (
        <EmptyState
          size="sm"
          icon={<Weight />}
          title="Sin registros de peso"
          description="Todavía no se cargó su peso inicial."
          action={
            <TextLink to={athleteEditPath(athleteId)}>
              Cargar peso inicial
            </TextLink>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          <dl className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-sm">Peso inicial</dt>
            <dd className="text-3xl font-bold tracking-tight">
              {formatWeightKg(initialWeightKg)}
            </dd>
          </dl>
          <p className="text-muted-foreground text-sm">
            Cargado en el alta. Todavía no hay registros posteriores.
          </p>
        </div>
      )}
    </SectionCard>
  )
}
