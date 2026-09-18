import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizePagination } from '../api/pagination'
import { apiClient } from '../api/client'
import { roomCategoryService } from '../room-category.service'
import { unitGroupService } from '../unit-group.service'

const empty = {
  success: true,
  message: 'Records retrieved successfully.',
  data: [],
  meta: { current_page: 1, per_page: 15, total: 0, last_page: 1 },
}
afterEach(() => vi.restoreAllMocks())
describe('Laravel pagination', () => {
  it('accepts the supplied empty response', () => {
    expect(normalizePagination(empty)).toEqual({ data: [], page: 1, perPage: 15, total: 0 })
  })
  it('uses the server page and page size for populated results', () => {
    expect(
      normalizePagination({
        ...empty,
        data: [{ id: 16 }],
        meta: {
          current_page: 2,
          per_page: 15,
          total: 31,
          last_page: 3,
        },
      }),
    ).toEqual({ data: [{ id: 16 }], page: 2, perPage: 15, total: 31 })
  })
  it('surfaces unsuccessful responses and rejects invalid metadata', () => {
    expect(() =>
      normalizePagination({ ...empty, success: false, message: 'Access denied.' }),
    ).toThrow('Access denied.')
    expect(() => normalizePagination({ ...empty, meta: { ...empty.meta, per_page: 0 } })).toThrow(
      'Invalid pagination',
    )
  })
  it.each([roomCategoryService, unitGroupService])(
    'loads dropdown pages using backend metadata',
    async (service) => {
      const first = { id: 1, name: 'First', description: null }
      const second = { id: 2, name: 'Second', description: null }
      const get = vi
        .spyOn(apiClient, 'get')
        .mockResolvedValueOnce({
          data: {
            ...empty,
            data: [first],
            meta: {
              current_page: 1,
              per_page: 1,
              total: 2,
              last_page: 2,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            ...empty,
            data: [second],
            meta: {
              current_page: 2,
              per_page: 1,
              total: 2,
              last_page: 2,
            },
          },
        })
      expect(await service.listOptions()).toEqual([first, second])
      expect(get).toHaveBeenCalledTimes(2)
      expect(get.mock.calls[1]?.[1]?.params.page).toBe(2)
    },
  )
})
