// id que el control debe recibir en aria-describedby para anunciar el error
export const getFieldErrorId = (htmlFor: string) => `${htmlFor}-error`

// id del texto de ayuda, también va en aria-describedby
export const getFieldHintId = (htmlFor: string) => `${htmlFor}-hint`
