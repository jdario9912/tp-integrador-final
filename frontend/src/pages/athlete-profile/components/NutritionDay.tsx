import { formatIsoDate } from '../../../lib/iso-date'
import { useMealsOfDay } from '../../../lib/meals'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { EmptyState } from '../../../ui/empty-state'
import { RotateCw, Utensils } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import { DailySummaryCard } from '../../meals/components/DailySummaryCard'
import { useDailyNutritionSummary } from '../../meals/hooks/use-daily-nutrition-summary'
import { canRetryNutrition, nutritionErrorMessage } from '../nutrition-error'
import { formatWeekday, shiftDayUntil } from '../nutrition-range'
import { CoachMealItem } from './CoachMealItem'
import { PeriodNavigator } from './PeriodNavigator'

type NutritionDayProps = {
  athleteId: string
  // día que se mira, YYYY-MM-DD (nunca posterior a hoy)
  day: string
  today: string
  onChangeDay: (day: string) => void
}

const TITLE_ID = 'nutrition-day-title'
const MEALS_TITLE_ID = 'nutrition-day-meals-title'

// un día de la alimentación del atleta (US-25): el resumen nutricional (US-24) y sus comidas
// (US-23), cada una con su estado de revisión y la acción para revisarla
export function NutritionDay({
  athleteId,
  day,
  today,
  onChangeDay,
}: NutritionDayProps) {
  const list = useMealsOfDay(athleteId, day)
  const summary = useDailyNutritionSummary(athleteId, day)
  const isToday = day === today
  const meals = list.data

  const content = () => {
    if (list.error) {
      return (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            {nutritionErrorMessage(list.error)}
          </Callout>
          {canRetryNutrition(list.error) && (
            <OutlineButton
              size="sm"
              disabled={list.isFetching}
              onClick={() => void list.refetch()}
            >
              <RotateCw aria-hidden="true" /> Reintentar
            </OutlineButton>
          )}
        </div>
      )
    }

    if (list.isPending) {
      return (
        <div
          role="status"
          aria-label="Cargando comidas"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      )
    }

    if (!meals || meals.length === 0) {
      return (
        <EmptyState
          size="sm"
          icon={<Utensils />}
          title="No registró comidas ese día"
          description="Elegí otro día o mirá la semana para ver su constancia de registro."
        />
      )
    }

    return (
      <ul
        aria-labelledby={MEALS_TITLE_ID}
        aria-busy={list.isFetching}
        className="flex flex-col"
      >
        {meals.map((meal) => (
          <CoachMealItem key={meal.id} athleteId={athleteId} meal={meal} />
        ))}
      </ul>
    )
  }

  return (
    <section aria-labelledby={TITLE_ID} className="flex flex-col gap-5">
      <PeriodNavigator
        titleId={TITLE_ID}
        title={isToday ? 'Hoy' : formatWeekday(day)}
        subtitle={<time dateTime={day}>{formatIsoDate(day)}</time>}
        previousLabel="Día anterior"
        nextLabel="Día siguiente"
        onPrevious={() => onChangeDay(shiftDayUntil(day, -1, today))}
        onNext={() => onChangeDay(shiftDayUntil(day, 1, today))}
        isCurrent={isToday}
        currentLabel="Volver a hoy"
        onCurrent={() => onChangeDay(today)}
      />

      <DailySummaryCard
        summary={summary.data}
        isPending={summary.isPending}
        isRefreshing={summary.isFetching && !summary.isPending}
        error={summary.error}
        onRetry={() => void summary.refetch()}
      />

      <div className="flex flex-col gap-3">
        <h3 id={MEALS_TITLE_ID} className="text-base font-semibold sm:text-lg">
          Comidas del día
        </h3>
        {content()}
      </div>
    </section>
  )
}
