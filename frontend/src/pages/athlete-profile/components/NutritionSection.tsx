import { useState } from 'react'
import { todayInAppTimeZone } from '../../../lib/iso-date'
import { SectionCard } from '../../../ui/card'
import { Apple } from '../../../ui/icons'
import { SegmentedControl } from '../../../ui/segmented-control'
import { NutritionDay } from './NutritionDay'
import { NutritionWeek } from './NutritionWeek'

const TITLE = 'Alimentación'

type Period = 'week' | 'day'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'day', label: 'Día' },
]

type NutritionSectionProps = { athleteId: string }

// alimentación del atleta para su entrenador (US-25): por semana (constancia de registro y el resumen
// de cada día) o por día (resumen y comidas, con la revisión de cada una). La semana y el día se
// recuerdan por separado: volver a la semana muestra la que se estaba mirando
export function NutritionSection({ athleteId }: NutritionSectionProps) {
  // "hoy" en la zona de la app: el último día al que se puede navegar
  const today = todayInAppTimeZone()
  const [period, setPeriod] = useState<Period>('week')
  const [weekEnd, setWeekEnd] = useState(today)
  const [day, setDay] = useState(today)

  const openDay = (next: string) => {
    setDay(next)
    setPeriod('day')
  }

  return (
    <SectionCard title={TITLE} icon={<Apple />} aria-label={TITLE}>
      <SegmentedControl
        legend="Período de la alimentación"
        name="nutrition-period"
        options={PERIOD_OPTIONS}
        value={period}
        onValueChange={setPeriod}
        className="self-start"
      />
      {period === 'week' ? (
        <NutritionWeek
          athleteId={athleteId}
          weekEnd={weekEnd}
          today={today}
          onChangeWeekEnd={setWeekEnd}
          onSelectDay={openDay}
        />
      ) : (
        <NutritionDay
          athleteId={athleteId}
          day={day}
          today={today}
          onChangeDay={setDay}
        />
      )}
    </SectionCard>
  )
}
