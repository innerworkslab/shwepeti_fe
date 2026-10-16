export interface DashboardBooking {
  roomId: string | number
  guestName: string
  start_date_time: string
  end_date_time: string
  status: string
  totalGuests: number
  colorCode: string
}
export interface DashboardRoom {
  id: number
  name: string
  status: string
  price: string
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
  bookings: DashboardBooking[]
}
export interface BookingDashboard {
  start_date: string
  end_date: string
  dates: { date: string; label: string }[]
  room_categories: DashboardCategory[]
}
