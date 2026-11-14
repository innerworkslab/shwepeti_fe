import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from './api/client'
import { exportCashbook } from './cashbook-export.service'
vi.mock('./api/client', () => ({ apiClient: { get: vi.fn() } }))
afterEach(() => vi.resetAllMocks())
it.each(['transactions', 'closings'] as const)(
  'exports %s with cashbook ID and dates',
  async (kind) => {
    const blob = new Blob(['excel'])
    vi.mocked(apiClient.get).mockResolvedValue({ data: blob, headers: {} })
    const dates = { date_from: '2026-11-01', date_to: '2026-11-14' }
    const result = await exportCashbook(5, kind, dates)
    expect(apiClient.get).toHaveBeenCalledWith(
      `/api/v1/admin/cashbooks/5/${kind}/export`,
      expect.objectContaining({ params: dates, responseType: 'blob' }),
    )
    expect(result.blob).toBe(blob)
    expect(result.filename).toBe(`${kind}-cashbook-5-2026-11-01-to-2026-11-14.xlsx`)
  },
)
it('rejects missing cashbook IDs and JSON responses', async () => {
  const dates = { date_from: '2026-11-01', date_to: '2026-11-14' }
  await expect(exportCashbook(0, 'closings', dates)).rejects.toThrow('Choose a cashbook.')
  expect(apiClient.get).not.toHaveBeenCalled()
  vi.mocked(apiClient.get).mockResolvedValue({
    data: new Blob(['{}'], { type: 'application/json' }),
    headers: {},
  })
  await expect(exportCashbook(1, 'closings', dates)).rejects.toThrow('Could not export report.')
})
