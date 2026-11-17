// regla del comentario de la revisión (US-25), espejo del backend con el mismo mensaje
export const MEAL_REVIEW_OBSERVATION_MAX_LENGTH = 1000

// se valida recortado, como lo recorta el backend antes de medirlo
export const validateMealReviewObservation = (value: string) =>
  value.trim().length > MEAL_REVIEW_OBSERVATION_MAX_LENGTH
    ? `El comentario no puede superar los ${MEAL_REVIEW_OBSERVATION_MAX_LENGTH} caracteres`
    : undefined

// el comentario va recortado; vacío no se manda (la comida se marca revisada sin texto)
export const toMealReviewInput = (observation: string) => ({
  observation: observation.trim() || undefined,
})
