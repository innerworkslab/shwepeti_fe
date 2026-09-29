import { apiClient } from './api/client'
import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse, PaginationParams } from '@/types/api'
import type {
  SupplierApBalance,
  SupplierApLedger,
  CreateSupplierApPaymentInput,
  UpdateSupplierApPaymentInput,
} from '@/types/supplier-ap'
const base = '/api/v1/admin'
export const supplierApService = {
  async listBalances(params: PaginationParams = {}, signal?: AbortSignal) {
    const response = await apiClient.get<ApiPaginatedResponse<SupplierApBalance>>(
      `${base}/supplier-ap-balances`,
      { params, signal },
    )
    return normalizePagination(response.data)
  },
  async listLedgers(params: PaginationParams & { supplier_id: number }, signal?: AbortSignal) {
    const response = await apiClient.get<ApiPaginatedResponse<SupplierApLedger>>(
      `${base}/supplier-ap-ledgers`,
      { params, signal },
    )
    return normalizePagination(response.data)
  },
  async createPayment(input: CreateSupplierApPaymentInput): Promise<void> {
    await apiClient.post(`${base}/supplier-ap-payments`, input)
  },
  async updatePayment(input: UpdateSupplierApPaymentInput): Promise<void> {
    await apiClient.post(`${base}/supplier-ap-payments`, input)
  },
  async updatePaymentStatus(id: number, input: { status: 'posted' }): Promise<void> {
    await apiClient.post(`${base}/supplier-ap-payments/${encodeURIComponent(id)}/status`, input)
  },
}
