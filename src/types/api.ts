// Example API contract. Align with the backend before connecting a feature.
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
