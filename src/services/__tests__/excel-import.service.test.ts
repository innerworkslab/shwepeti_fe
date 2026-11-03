import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { importExcel } from '../excel-import.service'
afterEach(() => vi.restoreAllMocks())
it.each(['items', 'menus'] as const)('uploads %s as multipart file', async (resource) => {
  const post = vi
    .spyOn(apiClient, 'post')
    .mockResolvedValue({ data: { success: true, message: 'Imported' } })
  const file = new File(['sample'], 'sample.xlsx')
  expect(await importExcel(resource, file)).toBe('Imported')
  expect(post.mock.calls[0]?.[0]).toBe(`/api/v1/admin/${resource}/import`)
  const data = post.mock.calls[0]?.[1] as FormData
  expect(data.get('file')).toBe(file)
  expect(Array.from(data.keys())).toEqual(['file'])
})
it('reports application-level import failures', async () => {
  vi.spyOn(apiClient, 'post').mockResolvedValue({
    data: { success: false, message: 'Invalid columns' },
  })
  await expect(importExcel('items', new File(['a'], 'sample.xlsx'))).rejects.toThrow(
    'Invalid columns',
  )
})
