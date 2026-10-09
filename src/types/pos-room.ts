export interface PosRoom {
  id: number
  name: string
  room_category_id: number
  room_category: { id: number; name: string; description: string | null; is_active: boolean } | null
  price: string | number
  status: string
  current_booking: Record<string, unknown> | null
  updated_at: string
}
