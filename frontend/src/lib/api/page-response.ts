// envelope de los listados paginados del backend; page arranca en 0
export type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
