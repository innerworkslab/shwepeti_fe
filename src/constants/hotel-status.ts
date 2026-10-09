export const roomStatuses = [
  'available',
  'occupied',
  'reserved',
  'dirty',
  'cleaning',
  'maintenance',
  'out_of_service',
] as const
export const bookingStatuses = ['reserved', 'checked_in', 'checked_out', 'cancelled'] as const
export type KnownRoomStatus = (typeof roomStatuses)[number]
export type BookingStatus = (typeof bookingStatuses)[number]
export function statusLabel(status: string) {
  return status.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
}
const colors: Record<string, [string, string]> = {
  available: ['#15803d', '#e8faef'],
  occupied: ['#1d4ed8', '#eff6ff'],
  reserved: ['#7e22ce', '#faf5ff'],
  dirty: ['#b45309', '#fffbeb'],
  cleaning: ['#0e7490', '#ecfeff'],
  maintenance: ['#b91c1c', '#fef2f2'],
  out_of_service: ['#475569', '#f1f5f9'],
  checked_in: ['#1d4ed8', '#eff6ff'],
  checked_out: ['#475569', '#f1f5f9'],
  cancelled: ['#b91c1c', '#fef2f2'],
}
export function statusStyle(status: string) {
  const [color, backgroundColor] = colors[status] ?? ['#475569', '#f1f5f9']
  return { color, backgroundColor }
}
