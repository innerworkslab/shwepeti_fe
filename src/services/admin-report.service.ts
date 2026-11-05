import { apiClient } from './api/client'
import { normalizePagination } from './api/pagination'
import type { ApiPaginatedResponse } from '@/types/api'
import { reportDefinitions, type AdminReport } from '@/constants/admin-reports'
export type ReportRow = Record<string, string | number | null>
export interface ReportMeta {
  currency?: string
  date_from?: string
  date_to?: string
  basis?: string
  has_missing_costs?: boolean
  missing_cost_count?: number
  recorded_total_expense?: string
  profit_before_unrecorded_costs?: string
  summary?: Record<
    string,
    string | number | { category_id: number; category: string; sales: string }[]
  >
}
export const adminReportService = {
  async exportExcel(
    report:
      | 'daily-summary'
      | 'room-occupancy'
      | 'room-revenue'
      | 'guest-balances'
      | 'food-sales'
      | 'top-selling-items'
      | 'other-bills'
      | 'inventory-balance'
      | 'low-stock'
      | 'depreciation',
    params: { date_from: string; date_to: string },
    signal?: AbortSignal,
  ) {
    const response = await apiClient.get<Blob>(`/api/v1/admin/reports/${report}/export`, {
      params,
      responseType: 'blob',
      headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      signal,
    })
    if (!response.data.size || response.data.type.includes('json')) {
      throw new Error('Could not export report.')
    }
    const disposition = String(response.headers['content-disposition'] ?? '')
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
    let filename = /filename="([^"]+)"|filename=([^;]+)/i.exec(disposition)?.slice(1).find(Boolean)
    if (encoded) {
      try {
        filename = decodeURIComponent(encoded)
      } catch {
        /* Use the plain filename instead. */
      }
    }
    filename = filename?.replace(/[\\/\x00-\x1f]/g, '_').trim()
    return {
      blob: response.data,
      filename: filename || `${report}-${params.date_from}-to-${params.date_to}.xlsx`,
    }
  },
  async list(
    report: AdminReport,
    params: { page: number; perPage: number; date_from: string; date_to: string },
    signal?: AbortSignal,
  ) {
    if (!Object.hasOwn(reportDefinitions, report)) throw new Error('Unknown report.')
    const { perPage, ...query } = params
    const { data } = await apiClient.get<
      ApiPaginatedResponse<ReportRow> & {
        meta: ApiPaginatedResponse<ReportRow>['meta'] & ReportMeta
      }
    >(`/api/v1/admin/reports/${report}`, { params: { ...query, per_page: perPage }, signal })
    if (!data.success) throw new Error(data.message || 'Could not load report.')
    if (!Array.isArray(data.data)) throw new Error('Invalid report response.')
    return { ...normalizePagination(data), reportMeta: data.meta }
  },
}
