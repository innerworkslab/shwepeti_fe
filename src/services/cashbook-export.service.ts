import { posApiClient } from './api/pos-client'
import { apiClient } from './api/client'
export async function exportCashbook(
  id: number,
  kind: 'transactions' | 'closings',
  params: { date_from: string; date_to: string },
  signal?: AbortSignal,
  pos = false,
) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Choose a cashbook.')
  const response = await (pos ? posApiClient : apiClient).get<Blob>(
    `${pos ? '' : '/api/v1/admin'}/cashbooks/${id}/${kind}/export`,
    {
      params,
      responseType: 'blob',
      headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      signal,
    },
  )
  if (!response.data.size || response.data.type.includes('json')) {
    throw new Error('Could not export report.')
  }
  const disposition = String(response.headers['content-disposition'] ?? '')
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  let filename = /filename="([^"]+)"|filename=([^;]+)/i.exec(disposition)?.slice(1).find(Boolean)
  if (encoded) {
    try {
      filename = decodeURIComponent(encoded)
    } catch {
      /* Use the plain filename instead. */
    }
  }
  filename = filename?.replace(/[\\/\x00-\x1f]/g, '_').trim()
  return {
    blob: response.data,
    filename: filename || `${kind}-cashbook-${id}-${params.date_from}-to-${params.date_to}.xlsx`,
  }
}
