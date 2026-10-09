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
const wrappers: ReturnType<typeof mount>[] = []
const descriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
beforeEach(() => {
  sessionStorage.clear()
  vi.resetAllMocks()
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
})
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/pos', component: PosView },
      { path: '/pos/bookings/create', component: { template: '<div />' } },
    ],
  })
  await router.push('/pos')
  const wrapper = mount(PosView, { global: { plugins: [createPinia(), router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
it('groups live rooms by category, searches actual names and fetches the available endpoint', async () => {
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
  expect(posRoomService.available).toHaveBeenCalledWith(expect.any(AbortSignal))
  expect(wrapper.findAll('.room-row')).toHaveLength(1)
  await wrapper.get('.available-filter input').setValue(false)
  await flushPromises()
  expect(posRoomService.list).toHaveBeenCalledTimes(2)
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
  vi.mocked(posRoomService.list).mockRejectedValueOnce(new Error('List unavailable'))
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
it('ignores outdated list responses after switching to available rooms', async () => {
  let resolve!: (value: typeof rooms) => void
  vi.mocked(posRoomService.list).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done
    }),
  )
  const wrapper = await render()
  const signal = vi.mocked(posRoomService.list).mock.lastCall?.[0]
  await wrapper.get('.available-filter input').setValue(true)
  await flushPromises()
  expect(signal?.aborted).toBe(true)
  resolve(rooms)
  await flushPromises()
  expect(wrapper.findAll('.room-row')).toHaveLength(1)
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
