import { apiClient } from './client'
// Dropdown endpoints return all choices without table pagination parameters.
export async function loadOptions<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  signal?.throwIfAborted()
  const { data } = await apiClient.get<{ success: boolean; message?: string; data: T[] }>(path, {
    signal,
  })
  signal?.throwIfAborted()
  if (!data?.success) throw new Error(data?.message || 'Could not load options.')
  if (!Array.isArray(data.data)) throw new Error('Invalid options response.')
  return data.data
}
