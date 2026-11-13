// grillas compartidas por el contenido y su skeleton, para que la carga no salte al llegar la rutina

// mobile-first: el entrenamiento y debajo los datos de la rutina; desde lg, dos columnas
export const CONTENT_GRID =
  'grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'

// pestañas de los días: en móvil solo "Día N" (hasta 4 por fila en 360 px); desde sm, con el nombre
export const DAY_TABS_GRID =
  'grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]'
