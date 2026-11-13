import { Card } from '../../../ui/card'
import { Skeleton } from '../../../ui/skeleton'

const ROWS = 3

// misma forma que el entrenamiento cargado: resumen y panel del día con sus ejercicios
export function TrainingSessionSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando el entrenamiento"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48 max-w-full motion-reduce:animate-none" />
        <Skeleton className="h-4 w-60 max-w-full motion-reduce:animate-none" />
      </div>
      <Card padding="none">
        <div className="border-border-subtle flex items-center gap-4 border-b px-5 py-4 sm:px-6">
          <Skeleton className="size-9 shrink-0 rounded-lg motion-reduce:animate-none" />
          <Skeleton className="h-6 w-40 max-w-full motion-reduce:animate-none" />
        </div>
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
  )
}
