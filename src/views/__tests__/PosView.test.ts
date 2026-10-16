import { posDashboardService } from '@/services/pos-dashboard.service'
import type { BookingDashboard } from '@/types/pos-dashboard'
vi.mock('@/services/pos-dashboard.service', () => ({ posDashboardService: { get: vi.fn() } }))
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import PosView from '../PosView.vue'
import RoomDrawer from '@/components/pos/RoomDrawer.vue'
import { posRoomService } from '@/services/pos-room.service'
vi.mock('@/services/pos-room.service', () => ({
  posRoomService: { list: vi.fn(), available: vi.fn(), get: vi.fn() },
}))
const room = {
  id: 1,
  name: 'Room 101',
  room_category_id: 1,
  room_category: { id: 1, name: 'Standard', description: 'Comfortable room.', is_active: true },
  price: '45000.00',
  status: 'available',
  current_booking: null,
  updated_at: '2026-10-07 15:48:19',
}
const rooms = [
  room,
  {
    ...room,
    id: 4,
    name: 'Room 202',
    room_category_id: 2,
    room_category: { ...room.room_category, id: 2, name: 'Deluxe' },
    status: 'cleaning',
  },
]
const dashboard: BookingDashboard = {
  start_date: '2026-10-01',
  end_date: '2026-10-31',
  dates: Array.from({ length: 31 }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    label: String(i + 1),
  })),
  room_categories: rooms.map((room) => ({
    id: room.room_category_id,
    name: room.room_category.name,
    availability: [{ date: '2026-10-08', total_count: 1, booked_count: 0, available_count: 1 }],
    rooms: [room],
    bookings: [],
  })),
}
const wrappers: ReturnType<typeof mount>[] = []
const descriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 16))
  sessionStorage.clear()
  vi.resetAllMocks()
  vi.mocked(posDashboardService.get).mockResolvedValue(dashboard)
  vi.mocked(posRoomService.list).mockResolvedValue(rooms)
  vi.mocked(posRoomService.available).mockResolvedValue([room])
  vi.mocked(posRoomService.get).mockResolvedValue(room)
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() {} },
    close: { configurable: true, value() {} },
  })
})
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  for (const key of ['showModal', 'close']) {
    const descriptor = descriptors[key]
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key)
  }
  vi.restoreAllMocks()
  vi.useRealTimers()
})
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/pos', component: PosView },
      { path: '/pos/bookings/create', component: { template: '<div />' } },
      { path: '/pos/bookings/:id', component: { template: '<div />' } },
    ],
  })
  await router.push('/pos')
  const wrapper = mount(PosView, { global: { plugins: [createPinia(), router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
it('groups dashboard rooms, searches names and filters current availability locally', async () => {
  const wrapper = await render()
  expect(wrapper.findAll('.room-row')).toHaveLength(2)
  expect(wrapper.text()).toContain('Standard')
  expect(wrapper.text()).toContain('Deluxe')
  expect(wrapper.get('[aria-label="View Room 101: available"]').text()).toContain('Room 101')
  expect(wrapper.findAll('.booking')).toHaveLength(0)
  await wrapper.get('[aria-label="Search rooms"]').setValue('202')
  expect(wrapper.findAll('.room-row')).toHaveLength(1)
  await wrapper.get('[aria-label="Search rooms"]').setValue('')
  await wrapper.get('.available-filter input').setValue(true)
  await flushPromises()
  expect(posRoomService.available).not.toHaveBeenCalled()
  expect(wrapper.findAll('.room-row')).toHaveLength(1)
  await wrapper.get('.available-filter input').setValue(false)
  await flushPromises()
  expect(posDashboardService.get).toHaveBeenCalledTimes(1)
  expect(posRoomService.list).not.toHaveBeenCalled()
})
it('opens a drawer using fresh details by ID and handles null booking', async () => {
  const wrapper = await render()
  await wrapper.get('[aria-label="View Room 101: available"]').trigger('click')
  await flushPromises()
  expect(posRoomService.get).toHaveBeenCalledExactlyOnceWith(1, expect.any(AbortSignal))
  expect(wrapper.get('.room-drawer').text()).toContain('45000.00')
  expect(wrapper.get('.room-drawer').text()).toContain('No current booking')
  await wrapper.get('[aria-label="Close room details"]').trigger('click')
  expect(wrapper.find('.room-drawer').exists()).toBe(false)
})
it('supports room-list and detail retries', async () => {
  vi.mocked(posDashboardService.get).mockRejectedValueOnce(new Error('List unavailable'))
  const wrapper = await render()
  expect(wrapper.get('[role="alert"]').text()).toContain('List unavailable')
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  vi.mocked(posRoomService.get).mockRejectedValueOnce(new Error('Detail unavailable'))
  await wrapper.get('[aria-label="View Room 101: available"]').trigger('click')
  await flushPromises()
  await wrapper.get('.room-drawer [role="alert"] button').trigger('click')
  await flushPromises()
  expect(wrapper.get('.room-drawer').text()).toContain('45000.00')
})
it('ignores outdated dashboard responses after changing dates', async () => {
  let resolve!: (value: BookingDashboard) => void
  vi.mocked(posDashboardService.get).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done
    }),
  )
  const w = await render()
  const signal = vi.mocked(posDashboardService.get).mock.lastCall?.[1]
  await w
    .findAll('.date-controls button')
    .find((b) => b.text() === 'Today')!
    .trigger('click')
  await flushPromises()
  expect(signal?.aborted).toBe(true)
  resolve({ ...dashboard, room_categories: [] })
  await flushPromises()
  expect(w.findAll('.room-row')).toHaveLength(2)
})
it('renders booking bars and daily counts and selects a single start date', async () => {
  const booking = {
    roomId: '1',
    guestName: 'Mg Mg',
    start_date_time: '2026-10-08 13:00',
    end_date_time: '2026-10-09 12:00',
    status: 'reserved',
    totalGuests: 2,
    colorCode: '#10b981',
  }
  vi.mocked(posDashboardService.get).mockResolvedValue({
    ...dashboard,
    room_categories: [
      {
        ...dashboard.room_categories[0]!,
        bookings: [
          booking,
          { ...booking, guestName: 'Second guest' },
          { ...booking, roomId: '99', guestName: 'Other room' },
        ],
        rooms: [
          {
            ...dashboard.room_categories[0]!.rooms[0]!,
          },
        ],
      },
    ],
  })
  const w = await render()
  expect(w.findAll('.day')).toHaveLength(31)
  expect(w.findAll('button.booking')).toHaveLength(2)
  expect(w.get('button.booking').text()).toContain('Mg Mg')
  expect(w.get('button.booking').text()).toContain('2 guest(s)')
  expect(w.get('button.booking').attributes('style')).toContain(
    'border-left-color: rgb(16, 185, 129)',
  )
  await w.get('button.booking').trigger('click')
  await flushPromises()
  expect(posRoomService.get).toHaveBeenCalledWith(1, expect.any(AbortSignal))
  await w.get('[aria-label="Close room details"]').trigger('click')
  expect(w.get('button.booking').attributes('style')).toContain('22.5806')
  expect(w.findAll('button.booking')[1]!.attributes('style')).toContain('top: 42px')
  expect(w.get('.room-timeline').attributes('style')).toContain('84px')
  expect(w.find('[title="2026-10-08: 1 available, 0 booked, 1 total"]').exists()).toBe(true)
  expect(w.find('.dashboard-date-filters').exists()).toBe(false)
  await w.get('[aria-label="Select 2026-10-15"]').trigger('click')
  await flushPromises()
  expect(posDashboardService.get).toHaveBeenLastCalledWith(
    { start_date: '2026-10-15', end_date: '2026-10-15' },
    expect.any(AbortSignal),
  )
  expect(w.get('[aria-label="Select 2026-10-15"]').attributes('aria-pressed')).toBe('true')
  expect(w.findAll('.day[aria-pressed="true"]')).toHaveLength(1)
  await w.get('[aria-label="Select 2026-10-10"]').trigger('click')
  await flushPromises()
  expect(posDashboardService.get).toHaveBeenLastCalledWith(
    { start_date: '2026-10-10', end_date: '2026-10-15' },
    expect.any(AbortSignal),
  )
  expect(w.findAll('.day[aria-pressed="true"]')).toHaveLength(6)
  await w.get('[aria-label="Select 2026-10-20"]').trigger('click')
  await flushPromises()
  expect(posDashboardService.get).toHaveBeenLastCalledWith(
    { start_date: '2026-10-20', end_date: '2026-10-20' },
    expect.any(AbortSignal),
  )
})
it('aborts old room details, ignores stale results and cancels on dismissal', async () => {
  let resolve!: (value: typeof room) => void
  vi.mocked(posRoomService.get)
    .mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    .mockResolvedValueOnce({ ...room, id: 4, name: 'Room 202' })
  const wrapper = mount(RoomDrawer, { props: { roomId: 1 } })
  wrappers.push(wrapper)
  const oldSignal = vi.mocked(posRoomService.get).mock.lastCall?.[1]
  await wrapper.setProps({ roomId: 4 })
  await flushPromises()
  expect(oldSignal?.aborted).toBe(true)
  resolve(room)
  await flushPromises()
  expect(wrapper.get('h2').text()).toBe('Room 202')
  const signal = vi.mocked(posRoomService.get).mock.lastCall?.[1]
  wrapper.unmount()
  expect(signal?.aborted).toBe(true)
})
