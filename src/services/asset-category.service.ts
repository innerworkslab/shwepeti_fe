import { normalizePagination } from './api/pagination'
import { apiClient } from './api/client'
import type { ApiPaginatedResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  CreateAssetCategoryInput,
  AssetCategory,
  UpdateAssetCategoryInput,
} from '@/types/asset-category'

export interface AssetCategoryListParams extends PaginationParams {
  search?: string
  parent_id?: number
}

export const assetCategoryService = {
  async list(
    params: AssetCategoryListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<AssetCategory>> {
    const response = await apiClient.get<ApiPaginatedResponse<AssetCategory>>(
      '/api/v1/admin/asset-categories',
      {
        params,
        signal,
      },
    )
    return normalizePagination(response.data)
  },
  async listOptions(signal?: AbortSignal): Promise<AssetCategory[]> {
    const categories = new Map<number, AssetCategory>()
    let page = 1
    let totalPages = 1
    do {
      signal?.throwIfAborted()
      const result = await assetCategoryService.list({ page, perPage: 100 }, signal)
      if (
        !Array.isArray(result.data) ||
        result.page !== page ||
        !Number.isSafeInteger(result.total) ||
        result.total < 0 ||
        !Number.isSafeInteger(result.perPage) ||
        result.perPage < 1
      ) {
        throw new Error('Could not load asset categories: invalid pagination response.')
      }
      totalPages = Math.max(1, Math.ceil(result.total / result.perPage))
      if (!result.data.length && page < totalPages)
        throw new Error('Could not load all asset categories. Please retry.')
      for (const category of result.data) categories.set(category.id, category)
      page++
    } while (page <= totalPages)
    return [...categories.values()]
  },
  async get(id: number, signal?: AbortSignal): Promise<AssetCategory> {
    const response = await apiClient.get<AssetCategory | { data: AssetCategory }>(
      `/api/v1/admin/asset-categories/${encodeURIComponent(id)}`,
      { signal },
    )
    return 'data' in response.data ? response.data.data : response.data
  },
  async create(input: CreateAssetCategoryInput): Promise<void> {
    await apiClient.post('/api/v1/admin/asset-categories', input)
  },
  async update(input: UpdateAssetCategoryInput): Promise<void> {
    await apiClient.post('/api/v1/admin/asset-categories', input)
  },
  async toggleActive(id: number, input: { is_active: boolean }): Promise<void> {
    await apiClient.post(
      `/api/v1/admin/asset-categories/${encodeURIComponent(id)}/toggle-active`,
      input,
    )
  },
}
