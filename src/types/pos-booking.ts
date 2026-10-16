import type { PosRoom } from './pos-room'
export interface BookingPayment {
  id: number
  booking_id: number
  payment_no: string
  payment_type: string
  payment_method: string
  amount: string
  paid_at: string
  note: string | null
  created_by: number
  created_at: string
}
export interface PosBookingDetail {
  id: number
  booking_no: string
  room_id: number
  booking_type: string
  charge_type: string
  room: Omit<PosRoom, 'current_booking'> | null
  guest_name: string
  guest_phone: string | null
  guest_email: string | null
  guest_count: number
  expected_check_in_at: string
  expected_check_out_at: string
  checked_in_at: string | null
  checked_out_at: string | null
  status: string
  room_rate: string
  session_hours: number | null
  session_rate: string | null
  subtotal: string
  discount_amount: string
  tax_percentage?: number | string
  service_charge_percentage?: number | string
  service_charge_amount?: number | string
  tax_amount: string
  total_amount: string
  paid_amount: string
  balance_amount: string
  payments: BookingPayment[]
  note: string | null
  created_by: number | null
  updated_by: number | null
  checked_in_by: number | null
  checked_out_by: number | null
  created_at: string
  updated_at: string
}
