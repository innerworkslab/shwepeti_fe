import { apiClient } from './api/client'
import { posApiClient } from './api/pos-client'
import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse, PaginationParams } from '@/types/api'
export interface CashbookClosing {
  id: number
  cashbook_id: number
  closing_date: string
  closed_at: string
  opening_balance: string | number
  closing_balance: string | number
  remark: string | null
  created_by: number | null
}
export function cashbookClosings(pos: boolean) {
  const client = pos ? posApiClient : apiClient
  const path = pos ? '/cashbooks' : '/api/v1/admin/cashbooks'
  return {
    async list(id: number, params: PaginationParams, signal?: AbortSignal) {
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Choose a cashbook.')
      const { data } = await client.get<ApiPaginatedResponse<CashbookClosing>>(
        `${path}/${id}/closings`,
        { params, signal },
      )
      if (data.success === false) throw new Error(data.message)
      return normalizePagination(data)
    },
    async close(payload: { cashbook_id: number; remark: string }) {
      const { data } = await client.post(`${path}/close`, payload)
      if (data?.success === false) throw new Error(data.message)
    },
  }
}
