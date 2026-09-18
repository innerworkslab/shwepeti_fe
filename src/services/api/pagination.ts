import type { ApiPaginatedResponse, PaginatedResponse } from '@/types/api'

export function normalizePagination<T>(response: ApiPaginatedResponse<T>): PaginatedResponse<T> {
  if (!response.success) throw new Error(response.message || 'Could not load records.')
  const meta = response.meta
  if (
    !Array.isArray(response.data) ||
    !meta ||
    !Number.isSafeInteger(meta.current_page) ||
    meta.current_page < 1 ||
    !Number.isSafeInteger(meta.per_page) ||
    meta.per_page < 1 ||
    !Number.isSafeInteger(meta.total) ||
    meta.total < 0 ||
    !Number.isSafeInteger(meta.last_page) ||
    meta.last_page < 1
  )
    throw new Error('Invalid pagination response.')
  return {
    data: response.data,
    total: meta.total,
    page: meta.current_page,
    perPage: meta.per_page,
  }
}
