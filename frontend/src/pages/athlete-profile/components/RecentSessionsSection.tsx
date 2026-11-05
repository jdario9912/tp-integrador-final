import { SectionCard } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { Activity, CalendarCheck } from '../../../ui/icons'

const TITLE = 'Últimas sesiones'

// todavía no hay registro de sesiones (US-18 a US-21): US-18 le pasa el id del atleta, conecta
// acá su hook y deja este estado vacío para cuando no haya sesiones
export function RecentSessionsSection() {
  return (
    <SectionCard title={TITLE} icon={<CalendarCheck />} aria-label={TITLE}>
      <EmptyState
        size="sm"
        icon={<Activity />}
        title="Todavía no registró entrenamientos"
        description="Cuando registre una sesión, la vas a ver acá."
      />
    </SectionCard>
  )
}
