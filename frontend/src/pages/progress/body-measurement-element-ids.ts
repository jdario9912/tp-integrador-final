// US-45: ids fijos de la tarjeta de medidas (el foco pasa entre el formulario, el aviso y la lista)
export const MEASUREMENT_ENTRY_HEADING_ID = 'measurement-entry-heading'
export const MEASUREMENT_LATEST_HEADING_ID = 'measurement-latest-heading'
export const MEASUREMENT_NOTICE_ID = 'measurement-notice'
export const MEASUREMENT_CONFLICT_ID = 'measurement-conflict'

export const measurementEditButtonId = (recordId: string) =>
  `measurement-${recordId}-edit`

// prefijo de los campos del formulario: "measurement-date", "measurement-ARM-LEFT"...
export const MEASUREMENT_FIELD_PREFIX = 'measurement'
