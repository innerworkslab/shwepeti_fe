import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { userService } from '../user.service'

afterEach(() => vi.restoreAllMocks())
describe('userService', () => {
  it('GETs users with pagination and fetches the selected user by ID', async () => {
    const user = {
      id: 9,
      name: 'Test',
      email: 'test@example.com',
      role: 'front_office_administrator',
      portal_access: 'admin',
    }
    const list = { data: [user], total: 1, page: 1, perPage: 20 }
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Loaded',
          data: list.data,
          meta: {
            current_page: list.page,
            per_page: list.perPage,
            total: list.total,
            last_page: 1,
          },
        },
      })
      .mockResolvedValueOnce({ data: user })
    const signal = new AbortController().signal
    expect(await userService.list({ page: 1 }, signal)).toEqual(list)
    expect(await userService.get(9, signal)).toEqual(user)
    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/admin/users', { params: { page: 1 }, signal })
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/admin/users/9', { signal })
  })
  it('POSTs create and update to /users, including ID only on update', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: null })
    const input = {
      name: 'test',
      email: 'tests@example.com',
      password: 'password',
      role: 'front_office_administrator',
      portal_access: 'admin',
    }
    await userService.create(input)
    await userService.update({ ...input, id: 9 })
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/users', input)
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/users', { ...input, id: 9 })
  })
})

it('unwraps the standard backend envelope for user details', async () => {
  const user = {
    id: 9,
    name: 'Test',
    email: 'test@example.com',
    role: 'front_office_administrator',
    portal_access: 'admin',
  }
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: user } })
  expect(await userService.get(9)).toEqual(user)
})
