import axios from 'axios'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data
    const message =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : error.message || 'The request failed.'
    return new ApiError(message, error.response?.status, error.code, data)
  }
  return new ApiError(error instanceof Error ? error.message : 'An unexpected error occurred.')
}
