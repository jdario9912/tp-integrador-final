import { Skeleton } from '../../../ui/skeleton'

type CardSkeletonProps = {
  // lo anuncia el lector de pantalla mientras carga
  label: string
  rows?: number
}

// forma aproximada del contenido de la tarjeta mientras llegan los datos (sin saltos al cargar)
export function CardSkeleton({ label, rows = 2 }: CardSkeletonProps) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      <Skeleton className="h-7 w-48 max-w-full motion-reduce:animate-none" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton
          key={index}
          className="h-4 w-full max-w-72 motion-reduce:animate-none"
        />
      ))}
    </div>
  )
}
