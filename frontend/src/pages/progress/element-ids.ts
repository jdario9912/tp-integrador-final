// ids fijos de la página: el foco se mueve entre la tarjeta del formulario y la lista
export const ENTRY_HEADING_ID = 'weight-entry-heading'
export const LATEST_HEADING_ID = 'latest-weights-heading'
export const NOTICE_ID = 'weight-notice'
export const CONFLICT_ID = 'weight-conflict'

export const editButtonId = (recordId: string) => `weight-${recordId}-edit`

// US-29: tarjeta del gráfico de evolución. El campo de peso lo arma WeightForm como `${idPrefix}-weightKg` (idPrefix "weight")
export const EVOLUTION_HEADING_ID = 'weight-evolution-heading'
export const WEIGHT_KG_FIELD_ID = 'weight-weightKg'

// US-45: selector de la métrica de la evolución (peso o una medida)
export const EVOLUTION_METRIC_ID = 'weight-evolution-metric'
