import { cn } from '../lib/cn'

// nombre y bajada del proyecto: cambiarlos acá los actualiza en sidebar, auth y home
export const APP_NAME = 'Gestión Deportiva'
export const APP_TAGLINE = 'Entrenamiento profesional'

type BrandProps = {
  className?: string
  // sin la bajada, para espacios chicos como la barra superior en móvil
  compact?: boolean
}

export function Brand({ className, compact = false }: BrandProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img src="/favicon.svg" alt="" className="size-9 shrink-0" />
      <div className="flex min-w-0 flex-col">
        <span className="text-primary truncate text-lg font-bold tracking-tight">
          {APP_NAME}
        </span>
        {!compact && (
          <span className="text-muted-foreground truncate text-xs font-semibold">
            {APP_TAGLINE}
          </span>
        )}
      </div>
    </div>
  )
}
