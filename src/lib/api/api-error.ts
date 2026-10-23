export type FieldError = {
  field: string
  message: string
}

// formato de error que devuelve el backend (Spring)
export type ApiErrorResponse = {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  // solo presente en errores de validación (400)
  fieldErrors?: FieldError[]
}

export class ApiError extends Error {
  readonly status: number
  readonly path?: string
  readonly timestamp?: string
  readonly fieldErrors: FieldError[]

  constructor(
    message: string,
    status: number,
    details?: Partial<
      Pick<ApiErrorResponse, 'path' | 'timestamp' | 'fieldErrors'>
    >,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.path = details?.path
    this.timestamp = details?.timestamp
    this.fieldErrors = details?.fieldErrors ?? []
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError
