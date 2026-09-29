import { mountLargeFormFlow } from './mountLargeFormFlow'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RoomsView from '../RoomsView.vue'
import { roomService } from '@/services/room.service'
import { roomCategoryService } from '@/services/room-category.service'

vi.mock('@/services/room.service', () => ({
  roomService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
  },
}))
vi.mock('@/services/room-category.service', () => ({
  roomCategoryService: { listOptions: vi.fn() },
}))
const room = {
  id: 1,
  name: 'Room 101',
  room_category_id: 2,
  price: 120,
  room_beds: [
    { bed_type: 'king_bed', qty: 1 },
    { bed_type: 'single_bed', qty: 2 },
  ],
  status: 'cleaning',
}
const wrappers: ReturnType<typeof mount>[] = []
const descriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
async function render() {
  const wrapper = await mountLargeFormFlow(RoomsView, 'rooms')
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
async function openCreate(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('button.primary').trigger('click')
  await flushPromises()
}
async function fill(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('[name="name"]').setValue(' Room 101 ')
  await wrapper.get('[name="room_category_id"]').setValue('2')
  await wrapper.get('[name="price"]').setValue('120')
  await wrapper.get('[name="room_beds[0].bed_type"]').setValue('king_bed')
}
beforeEach(() => {
  vi.resetAllMocks()
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '')
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute('open')
      },
    },
  })
  vi.mocked(roomService.list).mockResolvedValue({ data: [room], total: 1, page: 1, perPage: 20 })
  vi.mocked(roomService.get).mockResolvedValue(room)
  vi.mocked(roomService.create).mockResolvedValue(undefined)
  vi.mocked(roomService.update).mockResolvedValue(undefined)
  vi.mocked(roomService.updateStatus).mockResolvedValue(undefined)
  vi.mocked(roomCategoryService.listOptions).mockResolvedValue([
    { id: 2, name: 'Superior', description: null },
  ])
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  for (const key of ['showModal', 'close']) {
    const descriptor = descriptors[key]
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key)
  }
})
describe('Rooms page', () => {
  it('loads the list and category dropdown and creates the exact nested payload', async () => {
    const wrapper = await render()
    expect(roomService.list).toHaveBeenCalledWith(
      { page: 1, perPage: 20, search: '', status: undefined },
      expect.any(AbortSignal),
    )
    await openCreate(wrapper)
    expect(wrapper.get('[name="room_category_id"]').text()).toContain('Superior')
    await fill(wrapper)
    await wrapper.get('.beds-heading button').trigger('click')
    await wrapper.get('[name="room_beds[1].bed_type"]').setValue('single_bed')
    await wrapper.get('[name="room_beds[1].qty"]').setValue('2')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(roomService.create).toHaveBeenCalledExactlyOnceWith({
      name: 'Room 101',
      room_category_id: 2,
      price: 120,
      room_beds: room.room_beds,
    })
    expect(wrapper.find('[data-form-surface]').exists()).toBe(false)
    expect(roomService.list).toHaveBeenCalledTimes(2)
  })

  it('validates category, nonnegative price, bed types, and integer quantities', async () => {
    const wrapper = await render()
    await openCreate(wrapper)
    await wrapper.get('[name="price"]').setValue('-1')
    await wrapper.get('[name="room_beds[0].qty"]').setValue('1.5')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(roomService.create).not.toHaveBeenCalled()
    expect(wrapper.get('[data-form-surface]').text()).toContain('Room name is required.')
    expect(wrapper.get('[data-form-surface]').text()).toContain('Choose a room category.')
    expect(wrapper.get('[data-form-surface]').text()).toContain('Price cannot be negative.')
    expect(wrapper.get('[data-form-surface]').text()).toContain('Bed type is required.')
    expect(wrapper.get('[data-form-surface]').text()).toContain('Quantity must be a whole number.')
  })

  it('loads fresh details and posts edited beds with the existing ID', async () => {
    const wrapper = await render()
    await wrapper.get('[aria-label="Edit Room 101"]').trigger('click')
    await flushPromises()
    expect(roomService.get).toHaveBeenCalledWith(1, expect.any(AbortSignal))
    expect((wrapper.get('[name="room_category_id"]').element as HTMLSelectElement).value).toBe('2')
    await wrapper.get('[name="name"]').setValue('Room 101 Updated')
    await wrapper.get('[name="price"]').setValue('150')
    await wrapper.get('[aria-label="Remove bed 2"]').trigger('click')
    await wrapper.get('[name="room_beds[0].qty"]').setValue('2')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(roomService.update).toHaveBeenCalledExactlyOnceWith({
      id: 1,
      name: 'Room 101 Updated',
      room_category_id: 2,
      price: 150,
      room_beds: [{ bed_type: 'king_bed', qty: 2 }],
    })
  })

  it('rejects no beds and accepts custom bed types with a zero price', async () => {
    const wrapper = await render()
    await openCreate(wrapper)
    await fill(wrapper)
    await wrapper.get('[aria-label="Remove bed 1"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-form-surface]').text()).toContain('Add at least one bed.')
    expect(roomService.create).not.toHaveBeenCalled()
    await wrapper.get('.beds-heading button').trigger('click')
    await wrapper.get('[name="room_beds[0].bed_type"]').setValue('custom_bed')
    await wrapper.get('[name="price"]').setValue('0')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(roomService.create).toHaveBeenCalledWith(
      expect.objectContaining({ price: 0, room_beds: [{ bed_type: 'custom_bed', qty: 1 }] }),
    )
  })

  it('uses the status-only endpoint and allows other status values', async () => {
    const wrapper = await render()
    await wrapper.get('[aria-label="Update status for Room 101"]').trigger('click')
    await flushPromises()
    expect(roomCategoryService.listOptions).not.toHaveBeenCalled()
    expect(wrapper.find('[name="price"]').exists()).toBe(false)
    expect((wrapper.get('[name="status"]').element as HTMLInputElement).value).toBe('cleaning')
    await wrapper.get('[name="status"]').setValue('other_status')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(roomService.updateStatus).toHaveBeenCalledExactlyOnceWith(1, { status: 'other_status' })
    expect(roomService.update).not.toHaveBeenCalled()
    expect(roomService.list).toHaveBeenCalledTimes(2)
  })

  it('blocks submission when categories fail to load and allows retry', async () => {
    vi.mocked(roomCategoryService.listOptions).mockRejectedValueOnce(
      new Error('Categories unavailable.'),
    )
    const wrapper = await render()
    await openCreate(wrapper)
    expect(wrapper.get('[data-form-surface] [role="alert"]').text()).toContain(
      'Categories unavailable.',
    )
    expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-form-surface] [role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[name="room_category_id"]').exists()).toBe(true)
  })

  it('preserves fields on failed save and prevents duplicate requests during retry', async () => {
    vi.mocked(roomService.create).mockRejectedValueOnce(new Error('Save failed.'))
    const wrapper = await render()
    await openCreate(wrapper)
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-form-surface] [role="alert"]').text()).toBe('Save failed.')
    let done!: () => void
    vi.mocked(roomService.create).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          done = resolve
        }),
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('[data-form-surface]').trigger('cancel')
    await flushPromises()
    expect(roomService.create).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-form-surface]').exists()).toBe(true)
    done()
    await flushPromises()
    expect(wrapper.find('[data-form-surface]').exists()).toBe(false)
  })

  it('aborts loading when dismissed and ignores late room details', async () => {
    let done!: (value: typeof room) => void
    vi.mocked(roomService.get).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve
        }),
    )
    const wrapper = await render()
    await wrapper.get('[aria-label="Edit Room 101"]').trigger('click')
    await flushPromises()
    const signal = vi.mocked(roomService.get).mock.lastCall?.[1]
    await wrapper.get('[data-form-surface]').trigger('cancel')
    await flushPromises()
    expect(signal?.aborted).toBe(true)
    await openCreate(wrapper)
    done(room)
    await flushPromises()
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('')
  })
})
