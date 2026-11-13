import type { ReactNode } from 'react'
import type { MuscleGroup } from '../../../lib/exercises'
import type { RoutineDay } from '../../../lib/routines'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { CalendarDays } from '../../../ui/icons'
import { CardTab, TabList, TabPanel, Tabs } from '../../../ui/tabs'
import { useSelectedDay } from '../hooks/use-selected-day'
import { DAY_TABS_GRID } from '../layout'
import { dayTitle } from '../my-routine-format'
import { DayWorkout } from './DayWorkout'

type RoutineDaysProps = {
  days: RoutineDay[]
  // el día que le toca al atleta: arranca abierto y lleva la marca "Hoy"
  nextDayId: string | null
  muscleGroups?: MuscleGroup[]
  // acción del panel de cada día (iniciar el entrenamiento, US-18); null si no corresponde
  renderAction?: (day: RoutineDay) => ReactNode
}

// nombre accesible de la pestaña, igual en móvil (donde no se ve el nombre del día) y en
// escritorio: "Día 1: Torso", y ", hoy" en la que toca. Contiene el texto visible (WCAG 2.5.3)
const tabLabel = (day: RoutineDay, isNext: boolean) =>
  isNext ? `${dayTitle(day)}, hoy` : dayTitle(day)

// selector de días (pestañas) y el entrenamiento del día elegido. En móvil la pestaña muestra
// solo "Día N": el nombre del día se lee en el título del panel
export function RoutineDays({
  days,
  nextDayId,
  muscleGroups,
  renderAction,
}: RoutineDaysProps) {
  const [selectedId, setSelectedId] = useSelectedDay(days, nextDayId)

  if (selectedId === null) {
    return (
      <Card>
        <EmptyState
          size="sm"
          icon={<CalendarDays />}
          title="Tu rutina todavía no tiene días cargados"
          description="Cuando tu entrenador cargue los días, vas a ver acá qué te toca entrenar."
        />
      </Card>
    )
  }

  return (
    <Tabs
      value={selectedId}
      onValueChange={setSelectedId}
      className="flex min-w-0 flex-col gap-4"
    >
      <TabList aria-label="Días de la rutina" className={DAY_TABS_GRID}>
        {days.map((day) => {
          const isNext = day.id === nextDayId
          return (
            <CardTab
              key={day.id}
              value={day.id}
              aria-label={tabLabel(day, isNext)}
            >
              <span className="font-semibold">Día {day.dayNumber}</span>
              <span className="text-muted-foreground group-aria-selected:text-primary-foreground w-full truncate max-sm:hidden">
                {day.name}
              </span>
              {isNext && (
                <span className="bg-primary text-primary-foreground group-aria-selected:bg-surface group-aria-selected:text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
                  Hoy
                </span>
              )}
            </CardTab>
          )
        })}
      </TabList>
      {days.map((day) => (
        <TabPanel key={day.id} value={day.id}>
          <DayWorkout
            day={day}
            isNext={day.id === nextDayId}
            muscleGroups={muscleGroups}
            action={renderAction?.(day)}
          />
        </TabPanel>
      ))}
    </Tabs>
  )
}
