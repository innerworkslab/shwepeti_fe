import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse } from '@/types/api'
import type { CashbookTransaction } from '@/types/cashbook-transaction'
import { posApiClient } from './api/pos-client'
export interface PosCashbook {
  id: number
  code: string
  name: string
  type: string
  opening_balance: string
  current_balance: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
export const posCashbookService = {
  async transactions(
    params: { page: number; cashbook_id: number; perPage?: number },
    signal?: AbortSignal,
  ) {
    const { data } = await posApiClient.get<
      ApiPaginatedResponse<CashbookTransaction> & {
        opening_balance?: string | number | null
        closing_balance?: string | number | null
      }
    >('/cashbook-transactions', { params, signal })
    if (data.success === false) throw new Error(data.message || 'Could not load transactions.')
    return {
      ...normalizePagination(data),
      opening_balance: data.opening_balance,
      closing_balance: data.closing_balance,
    }
  },
  async list(signal?: AbortSignal): Promise<PosCashbook[]> {
    const { data } = await posApiClient.get<{
      success: boolean
      message?: string
      data: PosCashbook[]
    }>('/cashbooks', { signal })
    if (!data?.success) throw new Error(data?.message || 'Could not load cashbooks.')
    if (!Array.isArray(data.data)) throw new Error('Invalid cashbooks response.')
    return data.data
  },
}
