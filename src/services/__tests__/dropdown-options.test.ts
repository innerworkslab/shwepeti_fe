import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { assetCategoryService } from '../asset-category.service'
import { warehouseService } from '../warehouse.service'
import { supplierService } from '../supplier.service'
import { roomCategoryService } from '../room-category.service'
import { itemCategoryService } from '../item-category.service'
import { menuCategoryService } from '../menu-category.service'
import { itemService } from '../item.service'
import { unitService } from '../unit.service'
import { unitGroupService } from '../unit-group.service'
import { cashbookService } from '../cashbook.service'
afterEach(() => vi.restoreAllMocks())
const cases = [
  [assetCategoryService.listOptions, '/api/v1/admin/asset-categories'],
  [warehouseService.listOptions, '/api/v1/admin/warehouses'],
  [supplierService.listOptions, '/api/v1/admin/suppliers'],
  [roomCategoryService.listOptions, '/api/v1/admin/room-categories'],
  [itemCategoryService.listOptions, '/api/v1/admin/item-categories'],
  [menuCategoryService.listOptions, '/api/v1/admin/menu-categories'],
  [itemService.listOptions, '/api/v1/admin/items'],
  [unitService.listOptions, '/api/v1/admin/units'],
  [unitGroupService.listOptions, '/api/v1/admin/unit-groups'],
  [cashbookService.listOptions, '/api/v1/admin/cashbooks'],
  [itemCategoryService.parentOptions, '/api/v1/admin/item-categories?parentId'],
] as const
it.each(cases)('loads dropdown choices without pagination %#', async (load, path) => {
  const rows = [
    { id: 1, name: 'First' },
    { id: 2, name: 'Second' },
  ]
  const get = vi
    .spyOn(apiClient, 'get')
    .mockResolvedValue({ data: { success: true, data: rows, meta: [] } })
  const signal = new AbortController().signal
  expect(await load(signal)).toEqual(rows)
  expect(get).toHaveBeenCalledExactlyOnceWith(path, { signal })
})
it('rejects errors and malformed lists and honors cancellation', async () => {
  const get = vi
    .spyOn(apiClient, 'get')
    .mockResolvedValueOnce({ data: { success: false, message: 'Unavailable' } })
    .mockResolvedValueOnce({ data: { success: true, data: {} } })
  await expect(unitService.listOptions()).rejects.toThrow('Unavailable')
  await expect(unitService.listOptions()).rejects.toThrow('Invalid options response')
  const controller = new AbortController()
  controller.abort()
  await expect(unitService.listOptions(controller.signal)).rejects.toThrow()
  expect(get).toHaveBeenCalledTimes(2)
})
