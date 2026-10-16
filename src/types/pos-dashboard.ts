export interface DashboardBooking {
  id: number
  booking_no: string
  guest_name: string
  guest_phone: string | null
  booking_type: string
  charge_type: string
  status: string
  expected_check_in_at: string
  expected_check_out_at: string
  checked_in_at: string | null
  checked_out_at: string | null
  total_amount: string
  paid_amount: string
  balance_amount: string
}
export interface DashboardRoom {
  id: number
  name: string
  status: string
  price: string
  bookings: DashboardBooking[]
}
export interface DashboardCategory {
  id: number
  name: string
  availability: {
    date: string
    total_count: number
    booked_count: number
    available_count: number
  }[]
  rooms: DashboardRoom[]
}
export interface BookingDashboard {
  start_date: string
  end_date: string
  dates: { date: string; label: string }[]
  room_categories: DashboardCategory[]
}
