import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import PosBookingFormView from '../PosBookingFormView.vue'
import { posRoomService } from '@/services/pos-room.service'
import { posBookingService } from '@/services/pos-booking.service'
vi.mock('@/services/pos-room.service', () => ({ posRoomService: { list: vi.fn() } }))
vi.mock('@/services/pos-booking.service', () => ({ posBookingService: { create: vi.fn() } }))
const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  vi.resetAllMocks()
})
async function render(type = 'reservation') {
  vi.mocked(posRoomService.list).mockResolvedValue([
    { id: 5, name: 'Room 301', price: '95000.00', room_category: { name: 'Suite' } },
  ] as never)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/pos/bookings/create', component: PosBookingFormView },
      { path: '/pos', component: { template: '<div />' } },
    ],
  })
  await router.push('/pos/bookings/create?type=' + type)
  const wrapper = mount(PosBookingFormView, { global: { plugins: [router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
async function fill(wrapper: ReturnType<typeof mount>) {
  for (const [name, value] of Object.entries({
    room_id: '5',
    guest_name: 'Mg Mg',
    expected_check_in_at: '2026-10-07T20:00',
    expected_check_out_at: '2026-10-08T12:00',
  }))
    await wrapper.get('[name="' + name + '"]').setValue(value)
}
it('validates, submits once and displays the returned booking confirmation', async () => {
  const wrapper = await render()
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(posBookingService.create).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Guest name is required')
  await fill(wrapper)
  let resolve!: (value: never) => void
  vi.mocked(posBookingService.create).mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  await wrapper.get('form').trigger('submit')
  expect(posBookingService.create).toHaveBeenCalledTimes(1)
  resolve({
    id: 4,
    booking_no: 'BK-4',
    guest_name: 'Mg Mg',
    status: 'reserved',
    total_amount: '95000.00',
    paid_amount: '0.00',
    balance_amount: '95000.00',
  } as never)
  await flushPromises()
  expect(wrapper.text()).toContain('BK-4')
  expect(wrapper.find('form').exists()).toBe(false)
})
it('opens walk-in mode and sends session fields without a deposit', async () => {
  const wrapper = await render('walk_in')
  expect(wrapper.find('[name="include_deposit"]').exists()).toBe(false)
  await fill(wrapper)
  await wrapper.get('[name="charge_type"]').setValue('session')
  await wrapper.get('[name="session_hours"]').setValue('3')
  await wrapper.get('[name="session_rate"]').setValue('25000')
  vi.mocked(posBookingService.create).mockRejectedValue(new Error('Room unavailable'))
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(posBookingService.create).toHaveBeenCalledWith(
    expect.objectContaining({ booking_type: 'walk_in', session_hours: 3, session_rate: 25000 }),
    expect.any(AbortSignal),
  )
  expect(vi.mocked(posBookingService.create).mock.calls[0]![0]).not.toHaveProperty('deposit')
  expect(wrapper.text()).toContain('Room unavailable')
  expect(wrapper.find('form').exists()).toBe(true)
})
