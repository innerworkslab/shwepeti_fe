import { apiClient } from './api/client'
export interface PermissionGroup {
  group: string
  label: string
  permissions: { name: string; label: string }[]
}
export const permissionService = {
  async list(signal?: AbortSignal): Promise<PermissionGroup[]> {
    const { data } = await apiClient.get<{
      success: boolean
      message?: string
      data: PermissionGroup[]
    }>('/api/v1/admin/permissions', { signal })
    if (!data.success || !Array.isArray(data.data))
      throw new Error(data.message || 'Could not load permissions.')
    return data.data
  },
}
