import { apiClient } from './api/client'
import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse, PaginationParams } from '@/types/api'
export type OpeningKind = 'cashbooks' | 'items'
export interface OpeningLine {
  cashbook_id?: number
  amount?: string | number
  item_id?: number
  warehouse_id?: number
  qty?: string | number
  unit_cost?: string | number
  total_value?: string | number
}
export interface OpeningBalance {
  id: number
  reference_no: string
  date: string
  status: string
  created_by: number
  remark?: string | null
  confirmed_at?: string | null
  cancelled_at?: string | null
  cashbooks?: OpeningLine[]
  items?: OpeningLine[]
}
export const openingBalanceService = {
  async list(
    kind: OpeningKind,
    params: PaginationParams & { date_from?: string; date_to?: string },
    signal?: AbortSignal,
  ) {
    const { data } = await apiClient.get<ApiPaginatedResponse<OpeningBalance>>(
      `/api/v1/admin/opening-balances/${kind}`,
      { params, signal },
    )
    if (!data.success) throw new Error(data.message)
    return normalizePagination(data)
  },
  async create(
    kind: OpeningKind,
    payload: { date: string; cashbooks?: OpeningLine[]; items?: OpeningLine[] },
  ) {
    const { data } = await apiClient.post(`/api/v1/admin/opening-balances/${kind}`, payload)
    if (data?.success === false) throw new Error(data.message)
  },
  async status(kind: OpeningKind, id: number, status: 'confirmed' | 'cancelled') {
    const { data } = await apiClient.post(`/api/v1/admin/opening-balances/${kind}/status`, {
      id,
      status,
    })
    if (data?.success === false) throw new Error(data.message)
  },
}
