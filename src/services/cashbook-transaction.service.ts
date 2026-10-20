import { apiClient } from './api/client'
import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse, PaginationParams } from '@/types/api'
import type {
  CashbookTransaction,
  CashbookTransactionFilters,
  CreateCashbookTransactionInput,
} from '@/types/cashbook-transaction'
const path = '/api/v1/admin/cashbook-transactions'
export const cashbookTransactionService = {
  async list(params: PaginationParams & CashbookTransactionFilters = {}, signal?: AbortSignal) {
    const response = await apiClient.get<
      ApiPaginatedResponse<CashbookTransaction> & {
        opening_balance?: string | number | null
        closing_balance?: string | number | null
      }
    >(path, {
      params,
      signal,
    })
    return {
      ...normalizePagination(response.data),
      opening_balance: response.data.opening_balance,
      closing_balance: response.data.closing_balance,
    }
  },
  async get(id: number, signal?: AbortSignal): Promise<CashbookTransaction> {
    const response = await apiClient.get<CashbookTransaction | { data: CashbookTransaction }>(
      `${path}/${encodeURIComponent(id)}`,
      { signal },
    )
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateCashbookTransactionInput): Promise<void> {
    await apiClient.post(path, input)
  },
}
