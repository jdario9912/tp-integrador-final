import type { ReactNode } from 'react'

type ProfileColumnsProps = {
  // datos del atleta
  main: ReactNode
  // su situación: peso, rutina y sesiones
  aside: ReactNode
}

// apiladas en móvil; dos columnas desde xl, cuando el sidebar deja lugar para las dos
export function ProfileColumns({ main, aside }: ProfileColumnsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <div className="flex min-w-0 flex-col gap-6">{aside}</div>
    </div>
  )
}
