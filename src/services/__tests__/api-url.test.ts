import { describe, expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({
  env: { apiBaseUrl: 'http://localhost:8000', apiTimeout: 15000 },
}))
import { apiClient } from '../api/client'

describe('direct API URLs', () => {
  it('keeps each service path exactly as supplied against the configured host', () => {
    expect(apiClient.getUri({ url: '/api/v1/admin/login' })).toBe(
      'http://localhost:8000/api/v1/admin/login',
    )
    expect(apiClient.getUri({ url: '/api/v1/admin/users', params: { page: 1 } })).toBe(
      'http://localhost:8000/api/v1/admin/users?page=1',
    )
    expect(apiClient.getUri({ url: '/api/v1/admin/logout' })).toBe(
      'http://localhost:8000/api/v1/admin/logout',
    )
  })
})
