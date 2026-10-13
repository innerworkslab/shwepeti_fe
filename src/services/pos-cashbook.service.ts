import { posApiClient } from './api/pos-client'
export interface PosCashbook {
  id: number
  code: string
  name: string
  type: string
  opening_balance: string
  current_balance: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
export const posCashbookService = {
  async list(signal?: AbortSignal): Promise<PosCashbook[]> {
    const { data } = await posApiClient.get<{
      success: boolean
      message?: string
      data: PosCashbook[]
    }>('/cashbooks', { signal })
    if (!data?.success) throw new Error(data?.message || 'Could not load cashbooks.')
    if (!Array.isArray(data.data)) throw new Error('Invalid cashbooks response.')
    return data.data
  },
}
