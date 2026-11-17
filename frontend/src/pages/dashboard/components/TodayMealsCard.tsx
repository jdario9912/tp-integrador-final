import { cn } from '../../../lib/cn'
import { formatGrams, formatKcal } from '../../../lib/foods'
import { todayInAppTimeZone } from '../../../lib/iso-date'
import { mealTypeLabel, useMealsOfDay, type MealType } from '../../../lib/meals'
import { paths } from '../../../router/paths'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { Utensils } from '../../../ui/icons'
import { TextLink } from '../../../ui/text-link'
import { macroShares } from '../../meals/macro-share'
import { useDailyNutritionSummary } from '../../meals/hooks/use-daily-nutrition-summary'
import type { DailyNutritionSummary } from '../../meals/types'
import { CardError } from './CardError'
import { CardSkeleton } from './CardSkeleton'
import { DashboardCardHeader } from './DashboardCardHeader'

const TITLE_ID = 'dashboard-meals-title'

type TodayMealsCardProps = {
  athleteId: string
  className?: string
}

// resumen del día de comidas (US-24) con los tipos de cada comida (US-23). Si el listado falla, el
// resumen se muestra igual: el panel no depende de los dos para mostrar los totales
export function TodayMealsCard({ athleteId, className }: TodayMealsCardProps) {
  const today = todayInAppTimeZone()
  const summary = useDailyNutritionSummary(athleteId, today)
  const meals = useMealsOfDay(athleteId, today)

  const content = () => {
    if (summary.isPending) {
      return <CardSkeleton label="Cargando las comidas de hoy" rows={3} />
    }

    if (summary.data === undefined) {
      return (
        <CardError
          error={summary.error}
          isRetrying={summary.isFetching}
          onRetry={() => void summary.refetch()}
        />
      )
    }

    if (summary.data.mealCount === 0) {
      return (
        <EmptyState
          size="sm"
          icon={<Utensils />}
          title="Todavía no registraste comidas"
          description="Registrá lo que comiste y vas a ver acá las calorías y los macros del día."
          action={<TextLink to={paths.meals}>Registrar comida</TextLink>}
        />
      )
    }

    return (
      <MealsTotals
        summary={summary.data}
        mealTypes={meals.data?.map((meal) => meal.type)}
      />
    )
  }

  return (
    <Card
      aria-labelledby={TITLE_ID}
      aria-busy={summary.isPending}
      className={cn('flex flex-col gap-4', className)}
    >
      <DashboardCardHeader
        id={TITLE_ID}
        title="Comidas de hoy"
        icon={<Utensils />}
        action={<TextLink to={paths.meals}>Ver comidas</TextLink>}
      />
      {content()}
    </Card>
  )
}

const BAR_SEGMENTS = [
  { key: 'protein', className: 'bg-primary' },
  { key: 'carbs', className: 'bg-info' },
  { key: 'fat', className: 'bg-warning' },
] as const

function MealsTotals({
  summary,
  mealTypes,
}: {
  summary: DailyNutritionSummary
  mealTypes: MealType[] | undefined
}) {
  const shares = macroShares(summary)
  const count =
    summary.mealCount === 1
      ? '1 comida registrada'
      : `${summary.mealCount} comidas registradas`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-3xl font-semibold tabular-nums">
          {formatKcal(summary.caloriesKcal)}
        </p>
        <p className="text-muted-foreground text-sm">{count}</p>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <Macro label="Proteínas" value={summary.proteinG} />
        <Macro label="Hidratos" value={summary.carbsG} />
        <Macro label="Grasas" value={summary.fatG} />
      </dl>

      {shares && (
        // la barra es decorativa: los gramos de arriba dan la misma información en texto
        <div
          aria-hidden="true"
          className="bg-muted flex h-2 overflow-hidden rounded-full"
        >
          {BAR_SEGMENTS.map(({ key, className }) => (
            <span
              key={key}
              className={className}
              style={{ width: `${shares[key] * 100}%` }}
            />
          ))}
        </div>
      )}

      {mealTypes && mealTypes.length > 0 && (
        <ul
          aria-label="Tipos de comida de hoy"
          className="flex flex-wrap gap-2"
        >
          {mealTypes.map((type, index) => (
            <li
              key={`${type}-${index}`}
              className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 text-xs font-medium"
            >
              {mealTypeLabel(type)}
            </li>
          ))}
        </ul>
      )}

      {summary.mealsWithoutNutrition > 0 && (
        <p className="text-muted-foreground text-sm">
          {summary.mealsWithoutNutrition === 1
            ? '1 comida sin datos nutricionales no se cuenta en el total.'
            : `${summary.mealsWithoutNutrition} comidas sin datos nutricionales no se cuentan en el total.`}
        </p>
      )}
    </div>
  )
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{formatGrams(value)}</dd>
    </div>
  )
}
