import { apiClient } from './api/client'
import { posApiClient } from './api/pos-client'
import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse, PaginationParams } from '@/types/api'
import type { CashbookTransaction } from '@/types/cashbook-transaction'
export interface TransferCashbook {
  id: number
  name: string
  code: string
  type?: string
  current_balance?: string | number
}
export interface CashbookTransferInput {
  request_id: string
  from_cashbook_id: number
  to_cashbook_id: number
  amount: string
  transfer_date: string
  remark: string
}
export interface CashbookTransfer extends CashbookTransferInput {
  id: number
  reference_no: string
  from_cashbook?: TransferCashbook
  to_cashbook?: TransferCashbook
  creator?: { name: string; email?: string }
  created_at?: string
  transactions?: CashbookTransaction[]
}
export type CashbookTransferFilters = { date_from?: string; date_to?: string; cashbook_id?: number }
export function cashbookTransfers(pos: boolean) {
  const client = pos ? posApiClient : apiClient
  const path = pos ? '/cashbook-transfers' : '/api/v1/admin/cashbook-transfers'
  return {
    async list(params: PaginationParams & CashbookTransferFilters, signal?: AbortSignal) {
      const { data } = await client.get<ApiPaginatedResponse<CashbookTransfer>>(path, {
        params,
        signal,
      })
      if (data.success === false) throw new Error(data.message)
      return normalizePagination(data)
    },
    async get(id: number, signal?: AbortSignal) {
      const { data } = await client.get<{
        success: boolean
        message: string
        data: CashbookTransfer
      }>(`${path}/${id}`, { signal })
      if (data.success === false) throw new Error(data.message)
      return data.data
    },
    async create(payload: CashbookTransferInput) {
      const { data } = await client.post(path, payload)
      if (data?.success === false) throw new Error(data.message)
    },
  }
}
