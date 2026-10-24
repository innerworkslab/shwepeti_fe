import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { adminReportService } from '../admin-report.service'
import { reportDefinitions, type AdminReport } from '@/constants/admin-reports'
afterEach(() => vi.restoreAllMocks())
it.each(Object.keys(reportDefinitions) as AdminReport[])(
  'loads %s with Laravel pagination and preserves metadata',
  async (report) => {
    const meta = {
      current_page: 1,
      per_page: 50,
      total: 1,
      last_page: 1,
      currency: 'MMK',
      summary: { total_outstanding: '45000.00' },
    }
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({
        data: { success: true, data: [{ name: 'Profit / Loss', amount: '-10000.00' }], meta },
      })
    const result = await adminReportService.list(report, {
      page: 1,
      perPage: 50,
      date_from: '2026-10-01',
      date_to: '2026-10-24',
    })
    expect(get).toHaveBeenCalledWith(`/api/v1/admin/reports/${report}`, {
      params: { page: 1, per_page: 50, date_from: '2026-10-01', date_to: '2026-10-24' },
      signal: undefined,
    })
    expect(result.reportMeta).toEqual(meta)
    expect(result.data[0]?.amount).toBe('-10000.00')
  },
)
