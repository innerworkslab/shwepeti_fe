// Normalized pagination consumed by DataTable and dropdown loaders.
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
}
export interface PaginationParams {
  page?: number
  perPage?: number
}

// Laravel collection response returned by all table endpoints.
export interface ApiPaginatedResponse<T> {
  success: boolean
  message: string
  data: T[]
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
}
