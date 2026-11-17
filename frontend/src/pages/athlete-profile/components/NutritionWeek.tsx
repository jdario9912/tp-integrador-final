import { formatGrams, formatKcal } from '../../../lib/foods'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { EmptyState } from '../../../ui/empty-state'
import { ChevronRight, RotateCw, Utensils } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import { useNutritionOverview } from '../hooks/use-nutrition-overview'
import { canRetryNutrition, nutritionErrorMessage } from '../nutrition-error'
import {
  consistencyText,
  formatRange,
  formatWeekday,
  mealCountText,
  shiftWeekEnd,
  weekEndingOn,
} from '../nutrition-range'
import type { NutritionOverview } from '../types'
import { PeriodNavigator } from './PeriodNavigator'

type NutritionWeekProps = {
  athleteId: string
  // último día de la semana que se mira (nunca posterior a hoy)
  weekEnd: string
  today: string
  onChangeWeekEnd: (end: string) => void
  // abre la vista del día con sus comidas
  onSelectDay: (day: string) => void
}

const TITLE_ID = 'nutrition-week-title'

// la semana de alimentación del atleta (US-25): la constancia de registro y el resumen de cada día.
// Elegir un día abre sus comidas, con el estado de revisión de cada una
export function NutritionWeek({
  athleteId,
  weekEnd,
  today,
  onChangeWeekEnd,
  onSelectDay,
}: NutritionWeekProps) {
  const range = weekEndingOn(weekEnd)
  const overview = useNutritionOverview(athleteId, range)
  const isCurrent = weekEnd === today

  const content = () => {
    if (overview.error) {
      return (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            {nutritionErrorMessage(overview.error)}
          </Callout>
          {canRetryNutrition(overview.error) && (
            <OutlineButton
              size="sm"
              disabled={overview.isFetching}
              onClick={() => void overview.refetch()}
            >
              <RotateCw aria-hidden="true" /> Reintentar
            </OutlineButton>
          )}
        </div>
      )
    }

    if (overview.isPending) {
      return (
        <div
          role="status"
          aria-label="Cargando la alimentación de la semana"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-16" />
          <Skeleton className="h-40" />
        </div>
      )
    }

    return (
      <WeekContent
        overview={overview.data}
        isRefreshing={overview.isFetching}
        onSelectDay={onSelectDay}
      />
    )
  }

  return (
    <section aria-labelledby={TITLE_ID} className="flex flex-col gap-5">
      <PeriodNavigator
        titleId={TITLE_ID}
        title={isCurrent ? 'Últimos 7 días' : 'Semana'}
        subtitle={formatRange(range)}
        previousLabel="Semana anterior"
        nextLabel="Semana siguiente"
        onPrevious={() => onChangeWeekEnd(shiftWeekEnd(weekEnd, -1, today))}
        onNext={() => onChangeWeekEnd(shiftWeekEnd(weekEnd, 1, today))}
        isCurrent={isCurrent}
        currentLabel="Volver a esta semana"
        onCurrent={() => onChangeWeekEnd(today)}
      />
      {content()}
    </section>
  )
}

function WeekContent({
  overview,
  isRefreshing,
  onSelectDay,
}: {
  overview: NutritionOverview
  isRefreshing: boolean
  onSelectDay: (day: string) => void
}) {
  return (
    <div aria-busy={isRefreshing} className="flex flex-col gap-5">
      <dl className="bg-muted flex flex-col gap-1 rounded-lg p-3">
        <dt className="text-muted-foreground text-xs font-semibold">
          Constancia de registro
        </dt>
        <dd className="font-semibold">
          {consistencyText(overview.daysWithMeals, overview.totalDays)}
        </dd>
      </dl>

      {overview.daysWithMeals === 0 ? (
        <EmptyState
          size="sm"
          icon={<Utensils />}
          title="Sin comidas registradas en estos días"
          description="Cuando el atleta registre sus comidas, las vas a ver acá con su resumen nutricional."
        />
      ) : (
        <ul
          aria-label="Días de la semana"
          className="divide-border-subtle border-border-subtle flex flex-col divide-y rounded-control border"
        >
          {overview.days.map((day) => (
            <li key={day.date}>
              <button
                type="button"
                aria-label={`Ver las comidas del ${formatWeekday(day.date)}`}
                onClick={() => onSelectDay(day.date)}
                className="hover:bg-muted focus-visible:ring-ring flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-sm font-semibold first-letter:uppercase">
                      {formatWeekday(day.date)}
                    </span>
                    {day.mealCount > 0 && (
                      <span className="text-sm font-semibold tabular-nums">
                        {formatKcal(day.caloriesKcal)}
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {day.mealCount > 0
                      ? `${mealCountText(day.mealCount)} · Prot. ${formatGrams(day.proteinG)} · Carb. ${formatGrams(day.carbsG)} · Grasas ${formatGrams(day.fatG)}`
                      : mealCountText(0)}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="text-muted-foreground size-5 shrink-0"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
