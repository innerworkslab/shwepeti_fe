import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/stores/session'
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ path: '/users/create' }),
}))
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  useSessionStore().setSession(
    {
      id: 1,
      name: 'Admin',
      email: 'admin@example.com',
      role: 'hotel_administrator',
      permissions: ['users.create', 'users.update', 'users.manage_permissions'],
    },
    'test',
  )
})
import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Form from '@/components/users/UserFormModal.vue'
import { permissionService } from '@/services/permission.service'
import { userService } from '@/services/user.service'
vi.mock('@/services/permission.service', () => ({ permissionService: { list: vi.fn() } }))
vi.mock('@/services/user.service', () => ({
  userService: { get: vi.fn(), create: vi.fn(), update: vi.fn() },
}))
it('groups permissions and submits only selected names with the user', async () => {
  vi.mocked(permissionService.list).mockResolvedValue([
    {
      group: 'users',
      label: 'Users',
      permissions: [
        { name: 'users.view', label: 'View' },
        { name: 'users.create', label: 'Create' },
      ],
    },
  ])
  const w = mount(Form)
  try {
    await flushPromises()
    expect(w.find('dialog').exists()).toBe(false)
    await w.get('[name="name"]').setValue('Staff')
    await w.get('[name="email"]').setValue('staff@example.com')
    await w.get('[name="password"]').setValue('password')
    await w.get('[name="role"]').setValue('front_office_administrator')
    const all = w.get('[aria-label="Select all Users permissions"]')
    await all.setValue(true)
    expect((w.get('[name="users.view"]').element as HTMLInputElement).checked).toBe(true)
    await w.get('[name="users.create"]').setValue(false)
    expect((all.element as HTMLInputElement).indeterminate).toBe(true)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(userService.create).toHaveBeenCalledWith(
      expect.objectContaining({ permissions: ['users.view'], name: 'Staff' }),
    )
  } finally {
    w.unmount()
  }
})
it('loads existing permission selections on edit', async () => {
  vi.mocked(userService.get).mockResolvedValue({
    id: 7,
    name: 'Staff',
    email: 'staff@example.com',
    role: 'hotel_administrator',
    portal_access: 'admin',
    permissions: ['users.view'],
  })
  const w = mount(Form, { props: { userId: 7 } })
  try {
    await flushPromises()
    expect((w.get('[name="users.view"]').element as HTMLInputElement).checked).toBe(true)
    expect((w.get('[name="users.create"]').element as HTMLInputElement).checked).toBe(false)
  } finally {
    w.unmount()
  }
})
