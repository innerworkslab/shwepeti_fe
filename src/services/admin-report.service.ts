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
