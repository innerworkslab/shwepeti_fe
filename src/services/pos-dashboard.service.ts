import { posApiClient } from './api/pos-client'
import type { BookingDashboard } from '@/types/pos-dashboard'
export const posDashboardService = {
  async get(
    params: { start_date: string; end_date: string },
    signal?: AbortSignal,
  ): Promise<BookingDashboard> {
    const { data } = await posApiClient.get<{
      success: boolean
      message?: string
      data: BookingDashboard
    }>('/booking-dashboard', { params, signal })
    if (!data?.success) throw new Error(data?.message || 'Could not load booking dashboard.')
    if (!data.data || !Array.isArray(data.data.dates) || !Array.isArray(data.data.room_categories))
      throw new Error('Invalid booking dashboard response.')
    return data.data
  },
}
