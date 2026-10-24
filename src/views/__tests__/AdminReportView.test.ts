import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import View from '../AdminReportView.vue'
import { adminReportService } from '@/services/admin-report.service'
vi.mock('@/services/admin-report.service', () => ({ adminReportService: { list: vi.fn() } }))
afterEach(() => vi.resetAllMocks())
it('filters dates, preserves filters across pages and resets when switching reports', async () => {
  vi.mocked(adminReportService.list).mockImplementation(
    async (_report, params) =>
      ({
        data: [{ name: 'Profit / Loss', amount: '-10000.00' }],
        page: params.page,
        perPage: params.perPage,
        total: 90,
        reportMeta: {
          currency: 'MMK',
          has_missing_costs: true,
          missing_cost_count: 2,
          summary: { total_room_revenue: '375000.00' },
        },
      }) as never,
  )
  const w = mount(View, { props: { report: 'profit-and-loss' } })
  try {
    await flushPromises()
    expect(w.get('tbody').text()).toContain('-10000.00')
    expect(w.text()).toContain('2 costs are missing')
    await w.get('[name="date_from"]').setValue('2026-09-01')
    await w.get('[name="date_to"]').setValue('2026-09-30')
    await w.get('form').trigger('submit')
    await flushPromises()
    await w.get('[aria-label="Next page"]').trigger('click')
    await flushPromises()
    expect(adminReportService.list).toHaveBeenLastCalledWith(
      'profit-and-loss',
      { page: 2, perPage: 15, date_from: '2026-09-01', date_to: '2026-09-30' },
      expect.any(AbortSignal),
    )
    const calls = vi.mocked(adminReportService.list).mock.calls.length
    await w.get('[name="date_from"]').setValue('2026-10-01')
    await w.get('form').trigger('submit')
    expect(adminReportService.list).toHaveBeenCalledTimes(calls)
    await w.setProps({ report: 'daily-summary' })
    await flushPromises()
    expect(adminReportService.list).toHaveBeenLastCalledWith(
      'daily-summary',
      expect.objectContaining({ page: 1, perPage: 50 }),
      expect.any(AbortSignal),
    )
    expect(w.get('thead').text()).toContain('Net Payment Received')
  } finally {
    w.unmount()
  }
})

it('shows Other Bill totals for an empty report', async () => {
  vi.mocked(adminReportService.list).mockResolvedValue({
    data: [],
    page: 1,
    perPage: 15,
    total: 0,
    reportMeta: {
      currency: 'MMK',
      summary: { item_total: '0.00', total_other_bill_revenue: '0.00' },
    },
  } as never)
  const w = mount(View, { props: { report: 'other-bills' } })
  try {
    await flushPromises()
    expect(w.get('h1').text()).toBe('Other Bill')
    expect(adminReportService.list).toHaveBeenCalledWith(
      'other-bills',
      expect.objectContaining({ page: 1 }),
      expect.any(AbortSignal),
    )
    expect(w.get('[aria-label="Report totals"]').text()).toContain('Total Other Bill Revenue')
    expect(w.findAll('[aria-label="Report totals"] dd').map((d) => d.text())).toEqual([
      '0.00',
      '0.00',
    ])
  } finally {
    w.unmount()
  }
})
