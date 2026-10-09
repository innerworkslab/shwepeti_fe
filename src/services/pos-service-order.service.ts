import { posApiClient } from './api/pos-client'
export type ServiceType = 'amenity' | 'laundry'
export interface ServiceItem {
  id: number
  name: string
  code: string
  description: string | null
  price: string | number
  is_active: boolean
  stock_unit_id: number
  stock_unit?: { id: number; name: string; symbol: string }
  item_category?: { id: number; name: string; code: string; is_active: boolean }
}
export interface ServiceOrder {
  id: number
  booking_id: number
  room_id: number
  order_no: string
  type: ServiceType
  status: string
  subtotal: string | number
  discount_amount: string | number
  tax_amount: string | number
  total_amount: string | number
  note: string | null
  items: {
    id: number
    item_id: number
    item?: ServiceItem
    qty: number
    unit_price: string | number
    total: string | number
    note: string | null
  }[]
}
export interface ServiceOrderInput {
  booking_id: number
  room_id: number
  type: ServiceType
  items: { item_id: number; qty: number; note: string }[]
  discount_amount: number
  tax_amount: number
  note: string
}
export const serviceOrderStatuses = ['pending', 'processing', 'completed', 'cancelled'] as const
export type ServiceOrderStatus = (typeof serviceOrderStatuses)[number]
interface Envelope<T> {
  success: boolean
  message?: string
  data: T
  meta?: { last_page?: number }
}
function unwrap<T>(response: Envelope<T>): T {
  if (response?.success !== true)
    throw new Error(response?.message || 'Service order request failed.')
  return response.data
}
async function list<T>(
  path: string,
  signal?: AbortSignal,
  params: Record<string, string> = {},
): Promise<T[]> {
  const rows: T[] = []
  let page = 1
  let last = 1
  do {
    const response = await posApiClient.get<Envelope<T[]>>(path, {
      signal,
      params: { ...params, ...(page > 1 ? { page } : {}) },
    })
    const data = unwrap(response.data)
    if (!Array.isArray(data)) throw new Error('Invalid service order list response.')
    rows.push(...data)
    const reportedLast = response.data.meta?.last_page
    if (
      reportedLast !== undefined &&
      (!Number.isSafeInteger(reportedLast) || reportedLast < 1 || reportedLast > 1000)
    )
      throw new Error('Invalid service order pagination.')
    last = reportedLast ?? 1
    page++
  } while (page <= last && !signal?.aborted)
  return rows
}
export const posServiceOrderService = {
  items: (type: ServiceType, signal?: AbortSignal) =>
    list<ServiceItem>('/items', signal, { category: type }),
  orders: (signal?: AbortSignal) => list<ServiceOrder>('/service-orders', signal),
  async create(payload: ServiceOrderInput, signal?: AbortSignal) {
    const response = await posApiClient.post<Envelope<unknown>>('/service-orders', payload, {
      signal,
    })
    return unwrap(response.data)
  },
  async updateStatus(id: number, status: ServiceOrderStatus, signal?: AbortSignal) {
    const response = await posApiClient.post<Envelope<unknown>>(
      `/service-orders/${encodeURIComponent(id)}/status`,
      { status },
      { signal },
    )
    return unwrap(response.data)
  },
}
