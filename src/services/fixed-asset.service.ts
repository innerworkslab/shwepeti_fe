import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  CreateFixedAssetInput,
  FixedAssetDepreciation,
  FixedAsset,
  UpdateFixedAssetInput,
} from '@/types/fixed-asset'

export interface FixedAssetListParams extends PaginationParams {
  asset_category_id?: number
  cashbook_id?: number
  date_from?: string
  date_to?: string
}
const path = (id: number) => `/api/v1/admin/fixed-assets/${encodeURIComponent(id)}`

export const fixedAssetService = {
  async depreciations(
    id: number,
    params: PaginationParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<FixedAssetDepreciation>> {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid fixed asset ID.')
    const response = await apiClient.get<ApiPaginatedResponse<FixedAssetDepreciation>>(
      `${path(id)}/depreciations`,
      { params, signal },
    )
    return normalizePagination(response.data)
  },
  async list(
    params: FixedAssetListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<FixedAsset>> {
    const response = await apiClient.get<ApiPaginatedResponse<FixedAsset>>(
      '/api/v1/admin/fixed-assets',
      {
        params,
        signal,
      },
    )
    return normalizePagination(response.data)
  },
  async get(id: number, signal?: AbortSignal): Promise<FixedAsset> {
    const response = await apiClient.get<FixedAsset | { data: FixedAsset }>(path(id), { signal })
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateFixedAssetInput): Promise<void> {
    await apiClient.post('/api/v1/admin/fixed-assets', input)
  },
  async update(input: UpdateFixedAssetInput): Promise<void> {
    await apiClient.post('/api/v1/admin/fixed-assets', input)
  },
  async updateStatus(id: number, input: { status: 'posted' | 'cancelled' }): Promise<void> {
    await apiClient.post(`${path(id)}/status`, input)
  },
}
