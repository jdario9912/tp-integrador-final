import { cn } from '../../../lib/cn'
import {
  useProgressPhotoUrl,
  type ProgressPhoto,
} from '../../../lib/progress-photos'

type ProgressPhotoImageProps = {
  athleteId: string
  photo: ProgressPhoto
  // alt vacío si la foto ya la describe un texto cercano (la miniatura tiene su nombre)
  alt?: string
  loading?: 'eager' | 'lazy'
  className?: string
}

// imagen de una foto con URL firmada. Si la URL venció o la imagen falla, la renueva una vez
// (ver useProgressPhotoUrl). Mientras renueva muestra un placeholder, no una imagen rota
export function ProgressPhotoImage({
  athleteId,
  photo,
  alt = '',
  loading = 'lazy',
  className,
}: ProgressPhotoImageProps) {
  const { state, onImageError } = useProgressPhotoUrl(athleteId, photo)

  if (state.status === 'renewing') {
    return (
      <div
        role="status"
        aria-label="Cargando la foto"
        className={cn(
          'bg-secondary size-full animate-pulse motion-reduce:animate-none',
          className,
        )}
      />
    )
  }

  if (state.status === 'failed') {
    return (
      <div
        className={cn(
          'bg-secondary text-muted-foreground flex size-full items-center justify-center p-3 text-center text-sm',
          className,
        )}
      >
        No se pudo cargar la foto
      </div>
    )
  }

  return (
    <img
      src={state.url}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={onImageError}
      className={cn('size-full object-cover', className)}
    />
  )
}
