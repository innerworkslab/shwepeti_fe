import type { PosBookingDetail } from '@/types/pos-booking'
import { posApiClient } from './api/pos-client'
import type { PosBookingInput } from '@/schemas/pos-booking.schema'
export interface PosBooking {
  id: number
  booking_no: string
  guest_name: string
  status: string
  total_amount: string
  paid_amount: string
  balance_amount: string
}
export const posBookingService = {
  async list(signal?: AbortSignal): Promise<PosBookingDetail[]> {
    const { data } = await posApiClient.get<{
      success: boolean
      message: string
      data: PosBookingDetail[]
    }>('/bookings', { signal })
    if (!data?.success) throw new Error(data?.message || 'Could not load bookings.')
    if (!Array.isArray(data.data)) throw new Error('Invalid bookings response.')
    return data.data
  },
  async get(id: number, signal?: AbortSignal): Promise<PosBookingDetail> {
    const { data } = await posApiClient.get<{
      success: boolean
      message: string
      data: PosBookingDetail
    }>(`/bookings/${encodeURIComponent(id)}`, { signal })
    if (!data?.success) throw new Error(data?.message || 'Could not load booking.')
    if (!data.data || data.data.id !== id)
      throw new Error('The API returned a different booking. Please retry.')
    return data.data
  },
  async create(payload: PosBookingInput, signal?: AbortSignal): Promise<PosBooking> {
    const { data } = await posApiClient.post<{
      success: boolean
      message: string
      data: PosBooking
    }>('/bookings', payload, { signal })
    if (!data?.success) throw new Error(data?.message || 'Could not save booking.')
    if (!data.data?.id || !data.data.booking_no)
      throw new Error('Invalid booking response. Refresh rooms before trying again.')
    return data.data
  },
}
