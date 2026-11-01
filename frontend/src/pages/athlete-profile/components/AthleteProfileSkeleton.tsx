import { Card } from '../../../ui/card'
import { Skeleton } from '../../../ui/skeleton'
import { ProfileColumns } from './ProfileColumns'

// misma grilla que la ficha: al llegar los datos no se mueve nada
export function AthleteProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando ficha del atleta"
      className="flex flex-col gap-6"
    >
      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        <Skeleton className="size-23 rounded-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-40" />
        </div>
      </Card>
      <ProfileColumns
        main={
          <>
            <Skeleton className="rounded-card h-80" />
            <Skeleton className="rounded-card h-64" />
          </>
        }
        aside={
          <>
            <Skeleton className="rounded-card h-44" />
            <Skeleton className="rounded-card h-56" />
            <Skeleton className="rounded-card h-56" />
          </>
        }
      />
    </div>
  )
}
