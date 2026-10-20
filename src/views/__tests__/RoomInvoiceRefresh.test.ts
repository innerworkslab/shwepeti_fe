import { expect, it, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import RoomDrawer from '@/components/pos/RoomDrawer.vue'
import { posRoomService } from '@/services/pos-room.service'
vi.mock('@/services/pos-room.service', () => ({ posRoomService: { get: vi.fn() } }))
afterEach(() => vi.restoreAllMocks())
it('refreshes room and invoice after food and service orders without remounting carts', async () => {
  const descriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() {} },
    close: { configurable: true, value() {} },
  })
  const room = {
    id: 1,
    name: 'Room 101',
    status: 'occupied',
    current_booking: { id: 3, status: 'checked_in' },
    room_category_id: 1,
    room_category: null,
    price: '100',
    updated_at: '',
  }
  vi.mocked(posRoomService.get).mockResolvedValue(room)
  const w = mount(RoomDrawer, {
    props: { roomId: 1 },
    global: {
      stubs: {
        BookingActions: {
          props: ['refreshKey'],
          template: '<div class="invoice">{{ refreshKey }}</div>',
        },
        FoodOrderPanel: {
          emits: ['saved'],
          template: `<button class="food-save" @click="$emit('saved')">Save food</button>`,
        },
        ServiceOrderPanel: {
          emits: ['saved'],
          template: `<button class="service-save" @click="$emit('saved')">Save service</button>`,
        },
      },
    },
  })
  try {
    await flushPromises()
    const originalFood = w.get('.food-save').element
    await w.get('.food-save').trigger('click')
    await flushPromises()
    expect(posRoomService.get).toHaveBeenCalledTimes(2)
    expect(w.get('.invoice').text()).toBe('1')
    expect(w.get('.food-save').element).toBe(originalFood)
    await w
      .findAll('.service-tabs button')
      .find((b) => b.text() === 'Laundry')!
      .trigger('click')
    await w.get('.service-save').trigger('click')
    await flushPromises()
    expect(posRoomService.get).toHaveBeenCalledTimes(3)
    expect(w.get('.invoice').text()).toBe('2')
  } finally {
    w.unmount()
    for (const key of ['showModal', 'close']) {
      const descriptor = descriptors[key]
      if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor)
      else Reflect.deleteProperty(HTMLDialogElement.prototype, key)
    }
  }
})
