import { isApiError } from '../../../lib/api'
import { formatGrams, formatKcal } from '../../../lib/foods'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { OutlineButton } from '../../../ui/button'
import { RotateCw } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import { macroShares } from '../macro-share'
import type { DailyNutritionSummary } from '../types'

type DailySummaryCardProps = {
  summary: DailyNutritionSummary | undefined
  isPending: boolean
  // ya hay datos y se vuelven a pedir (tras guardar o borrar)
  isRefreshing: boolean
  error: unknown
  onRetry: () => void
}

const TITLE_ID = 'meals-summary-title'
const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intentá nuevamente.'

const mealCountText = (count: number) => {
  if (count === 0) return 'Sin comidas registradas este día'
  return count === 1 ? '1 comida registrada' : `${count} comidas registradas`
}

const withoutNutritionText = (count: number) =>
  count === 1
    ? '1 comida sin datos nutricionales no se cuenta en el total.'
    : `${count} comidas sin datos nutricionales no se cuentan en el total.`

const percent = (share: number) => `${Math.round(share * 100)} %`

// un dato del resumen: el valor es lo que se lee; la etiqueta lo nombra para el lector de pantalla
function Stat({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd
        className={
          emphasis
            ? 'text-xl font-semibold tabular-nums sm:text-2xl'
            : 'text-base font-semibold tabular-nums sm:text-lg'
        }
      >
        {value}
      </dd>
    </div>
  )
}

// resumen del día: calorías y macros del total, el reparto de gramos y el aviso de comidas sin datos
export function DailySummaryCard({
  summary,
  isPending,
  isRefreshing,
  error,
  onRetry,
}: DailySummaryCardProps) {
  return (
    <Card aria-labelledby={TITLE_ID} className="flex flex-col gap-4">
      <h3 id={TITLE_ID} className="text-base font-semibold sm:text-lg">
        Resumen del día
      </h3>

      {error ? (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            {isApiError(error) ? error.message : UNEXPECTED_ERROR}
          </Callout>
          <OutlineButton size="sm" disabled={isRefreshing} onClick={onRetry}>
            <RotateCw aria-hidden="true" /> Reintentar
          </OutlineButton>
        </div>
      ) : isPending || !summary ? (
        <div
          role="status"
          aria-label="Cargando el resumen del día"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10" />
        </div>
      ) : (
        <SummaryContent summary={summary} isRefreshing={isRefreshing} />
      )}
    </Card>
  )
}

function SummaryContent({
  summary,
  isRefreshing,
}: {
  summary: DailyNutritionSummary
  isRefreshing: boolean
}) {
  const shares = macroShares(summary)

  return (
    <div aria-busy={isRefreshing} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Stat
              label="Calorías"
              value={formatKcal(summary.caloriesKcal)}
              emphasis
            />
          </div>
          <Stat label="Proteínas" value={formatGrams(summary.proteinG)} />
          <Stat label="Carbohidratos" value={formatGrams(summary.carbsG)} />
          <Stat label="Grasas" value={formatGrams(summary.fatG)} />
        </dl>
        <p className="text-muted-foreground text-sm">
          {mealCountText(summary.mealCount)}
        </p>
      </div>

      {shares && (
        <div className="flex flex-col gap-2">
          <div
            aria-hidden="true"
            className="bg-muted flex h-2.5 overflow-hidden rounded-full"
          >
            <span
              className="bg-primary h-full"
              style={{ width: `${shares.protein * 100}%` }}
            />
            <span
              className="bg-info h-full"
              style={{ width: `${shares.carbs * 100}%` }}
            />
            <span
              className="bg-warning h-full"
              style={{ width: `${shares.fat * 100}%` }}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            Reparto por gramos: proteínas {percent(shares.protein)},
            carbohidratos {percent(shares.carbs)}, grasas {percent(shares.fat)}.
          </p>
        </div>
      )}

      {summary.mealsWithoutNutrition > 0 && (
        <Callout tone="warning">
          {withoutNutritionText(summary.mealsWithoutNutrition)}
        </Callout>
      )}
    </div>
  )
}
