import { apiClient } from './api/client'
export type ImportResource = 'items' | 'menus'
export async function importExcel(resource: ImportResource, file: File) {
  const payload = new FormData()
  payload.append('file', file)
  const { data } = await apiClient.post<{ success?: boolean; message?: string }>(
    `/api/v1/admin/${resource}/import`,
    payload,
  )
  if (data?.success === false) throw new Error(data.message || 'Import failed.')
  return data?.message || 'Import completed successfully.'
}
