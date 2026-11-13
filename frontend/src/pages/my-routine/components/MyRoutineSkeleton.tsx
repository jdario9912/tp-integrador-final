import { Card } from '../../../ui/card'
import { Skeleton } from '../../../ui/skeleton'
import { CONTENT_GRID, DAY_TABS_GRID } from '../layout'

const TABS = 3
const ROWS = 3

// misma forma que la rutina cargada: resumen, pestañas, ejercicios y datos de la rutina
export function MyRoutineSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando tu rutina"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-56 max-w-full motion-reduce:animate-none" />
        <Skeleton className="h-4 w-72 max-w-full motion-reduce:animate-none" />
      </div>
      <div className={CONTENT_GRID}>
        <div className="flex flex-col gap-4">
          <div className={DAY_TABS_GRID}>
            {Array.from({ length: TABS }, (_, index) => (
              <Skeleton
                key={index}
                className="rounded-control h-14 motion-reduce:animate-none"
              />
            ))}
          </div>
          <Card padding="none">
            {Array.from({ length: ROWS }, (_, index) => (
              <div
                key={index}
                className="border-border-subtle flex gap-4 border-b px-5 py-4 last:border-b-0 sm:px-6"
              >
                <Skeleton className="size-8 shrink-0 rounded-lg motion-reduce:animate-none" />
                <div className="flex flex-1 flex-col gap-3">
                  <Skeleton className="h-5 w-40 max-w-full motion-reduce:animate-none" />
                  <Skeleton className="h-12 motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </Card>
        </div>
        <Skeleton className="rounded-card h-48 motion-reduce:animate-none" />
      </div>
    </div>
  )
}
