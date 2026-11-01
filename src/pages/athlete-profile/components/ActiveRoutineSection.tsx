import { ClipboardList, Dumbbell } from 'lucide-react'
import { SectionCard } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'

const TITLE = 'Rutina activa'

// todavía no hay rutinas (US-16/US-17): US-16 le pasa el id del atleta, conecta acá su hook y
// deja este estado vacío para cuando no tenga una rutina asignada
export function ActiveRoutineSection() {
  return (
    <SectionCard title={TITLE} icon={<ClipboardList />} aria-label={TITLE}>
      <EmptyState
        size="sm"
        icon={<Dumbbell />}
        title="Sin rutina asignada"
        description="Todavía no tiene una rutina activa."
      />
    </SectionCard>
  )
}
