import { posApiClient } from './api/pos-client'
export interface PosMenuCategory {
  id: number
  name: string
  slug: string
  code: string
  description: string | null
  sort_order: number
  is_active: boolean
}
export interface PosMenu {
  id: number
  name: string
  price: string | number
  code?: string
  description?: string | null
  menu_category_id?: number
  menu_category?: PosMenuCategory | null
  cost_price?: string | number | null
  image_url?: string | null
  is_active?: boolean | number
  is_available?: boolean | number
}
export interface FoodOrder {
  id: number
  booking_id: number
  room_id: number
  order_no?: string
  status: string
  subtotal?: string | number
  discount_amount?: string | number
  tax_amount?: string | number
  total_amount?: string | number
  note?: string | null
  items?: {
    id?: number
    menu_id: number
    menu?: { name: string }
    qty: number
    unit_price?: string | number
    total?: string | number
    note?: string | null
  }[]
}
export interface FoodOrderInput {
  booking_id: number
  room_id: number
  items: { menu_id: number; qty: number; note: string }[]
  discount_amount: number
  tax_amount: number
  note: string
}
export const foodOrderStatuses = ['pending', 'preparing', 'served', 'cancelled'] as const
export type FoodOrderStatus = (typeof foodOrderStatuses)[number]
interface Envelope<T> {
  success: boolean
  message?: string
  data: T
  meta?: { last_page?: number }
}
function unwrap<T>(response: Envelope<T>): T {
  if (response?.success !== true)
    throw new Error(response?.message || 'Food service request failed.')
  return response.data
}
async function list<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const rows: T[] = []
  let page = 1
  let last = 1
  do {
    const response = await posApiClient.get<Envelope<T[]>>(path, {
      signal,
      ...(page > 1 ? { params: { page } } : {}),
    })
    const data = unwrap(response.data)
    if (!Array.isArray(data)) throw new Error('Invalid food service list response.')
    rows.push(...data)
    const reportedLast = response.data.meta?.last_page
    if (
      reportedLast !== undefined &&
      (!Number.isSafeInteger(reportedLast) || reportedLast < 1 || reportedLast > 1000)
    )
      throw new Error('Invalid food service pagination.')
    last = reportedLast ?? 1
    page++
  } while (page <= last && !signal?.aborted)
  return rows
}
export const posFoodService = {
  menus: (signal?: AbortSignal) => list<PosMenu>('/menus', signal),
  orders: (signal?: AbortSignal) => list<FoodOrder>('/food-orders', signal),
  async create(payload: FoodOrderInput, signal?: AbortSignal) {
    const response = await posApiClient.post<Envelope<unknown>>('/food-orders', payload, { signal })
    return unwrap(response.data)
  },
  async updateStatus(id: number, status: FoodOrderStatus, signal?: AbortSignal) {
    const response = await posApiClient.post<Envelope<unknown>>(
      `/food-orders/${encodeURIComponent(id)}/status`,
      { status },
      { signal },
    )
    return unwrap(response.data)
  },
}
