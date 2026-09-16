import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import UsersView from '../UsersView.vue'
import { userService } from '@/services/user.service'

vi.mock('@/services/user.service', () => ({
  userService: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn() },
}))
const user = {
  id: 7,
  name: 'Test User',
  email: 'test@example.com',
  role: 'front_office_administrator',
}
const wrappers: ReturnType<typeof mount>[] = []
const dialogDescriptors = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
function render() {
  const wrapper = mount(UsersView, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}
async function fill(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('[name="name"]').setValue(' Test User ')
  await wrapper.get('[name="email"]').setValue(' test@example.com ')
  await wrapper.get('[name="password"]').setValue(' password ')
  await wrapper.get('[name="role"]').setValue('front_office_administrator')
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
  vi.mocked(userService.list).mockResolvedValue({ data: [user], total: 1, page: 1, perPage: 20 })
  vi.mocked(userService.get).mockResolvedValue(user)
  vi.mocked(userService.create).mockResolvedValue(undefined)
  vi.mocked(userService.update).mockResolvedValue(undefined)
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  for (const key of ['showModal', 'close']) {
    const descriptor = dialogDescriptors[key]
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key)
  }
  vi.restoreAllMocks()
})

describe('Users page', () => {
  it('loads the first page with no status controls and blocks invalid create payloads', async () => {
    const wrapper = render()
    await flushPromises()
    expect(userService.list).toHaveBeenCalledWith(
      { page: 1, perPage: 20, search: '' },
      expect.any(AbortSignal),
    )
    expect(wrapper.get('tbody').text()).toContain(user.email)
    expect(wrapper.find('[title="Update status"]').exists()).toBe(false)
    await wrapper.get('button.primary').trigger('click')
    await wrapper.get('[name="email"]').setValue('not-an-email')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog').text()).toContain('Name is required.')
    expect(wrapper.get('dialog').text()).toContain('Enter a valid email address.')
    expect(wrapper.get('dialog').text()).toContain('Password is required.')
    expect(wrapper.get('dialog').text()).toContain('Role is required.')
    expect(userService.create).not.toHaveBeenCalled()
  })

  it('creates with the exact fields and preserves password whitespace', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(userService.create).toHaveBeenCalledExactlyOnceWith({
      name: user.name,
      email: user.email,
      password: ' password ',
      role: user.role,
    })
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.text()).toContain('User created.')
    expect(userService.list).toHaveBeenCalledTimes(2)
    expect(userService.get).not.toHaveBeenCalled()
  })

  it('fetches fresh detail, ignores returned passwords, and updates the selected ID', async () => {
    vi.mocked(userService.get).mockResolvedValue({
      ...user,
      name: 'Fresh name',
      password: 'never-prefill',
    } as typeof user)
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Test User"]').trigger('click')
    await flushPromises()
    expect(userService.get).toHaveBeenCalledWith(7, expect.any(AbortSignal))
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('Fresh name')
    expect((wrapper.get('[name="password"]').element as HTMLInputElement).value).toBe('')
    await wrapper.get('[name="password"]').setValue('new-password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(userService.update).toHaveBeenCalledExactlyOnceWith({
      ...user,
      name: 'Fresh name',
      password: 'new-password',
    })
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(userService.list).toHaveBeenCalledTimes(2)
  })

  it('blocks saving after detail failure and retries fetching', async () => {
    vi.mocked(userService.get).mockRejectedValueOnce(new Error('Could not load user.'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Test User"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('dialog [role="alert"]').text()).toContain('Could not load user.')
    expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(userService.update).not.toHaveBeenCalled()
    await wrapper.get('dialog [role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[name="name"]').exists()).toBe(true)
    expect(userService.get).toHaveBeenCalledTimes(2)
  })

  it('cancels detail loading on close and ignores a late response', async () => {
    let resolve!: (value: typeof user) => void
    vi.mocked(userService.get).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[aria-label="Edit Test User"]').trigger('click')
    const signal = vi.mocked(userService.get).mock.lastCall?.[1]
    expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('dialog').trigger('cancel')
    expect(signal?.aborted).toBe(true)
    await wrapper.get('button.primary').trigger('click')
    resolve(user)
    await flushPromises()
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe('')
    expect(userService.update).not.toHaveBeenCalled()
  })

  it('retains form values after a failed save and allows retry', async () => {
    vi.mocked(userService.create).mockRejectedValueOnce(new Error('Email already exists.'))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('dialog [role="alert"]').text()).toBe('Email already exists.')
    expect((wrapper.get('[name="email"]').element as HTMLInputElement).value).toBe(user.email)
    expect(userService.list).toHaveBeenCalledTimes(1)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('prevents duplicate saves and closing during submission', async () => {
    let resolve!: () => void
    vi.mocked(userService.create).mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done
        }),
    )
    const wrapper = render()
    await flushPromises()
    await wrapper.get('button.primary').trigger('click')
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('dialog').trigger('cancel')
    expect(userService.create).toHaveBeenCalledTimes(1)
    expect(wrapper.find('dialog').exists()).toBe(true)
    resolve()
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
})
