import type { AxiosInstance } from 'axios'
import { hasPermission, type PermissionRequirement } from '@/utils/permissions'

export function mutationPermission(url: string, data: unknown): PermissionRequirement | null {
  const path = url
    .split('?')[0]!
    .replace(/^.*\/api\/v1\/(admin|pos)\//, '')
    .replace(/^\//, '')
  const [resource, idOrAction, action] = path.split('/')
  if (!resource || ['login', 'logout'].includes(resource)) return null
  const group = resource.replaceAll('-', '_')
  const operation = action ?? idOrAction
  if (operation === 'close') return 'cashbooks.close'
  if (operation === 'payments') return 'bookings.record_payment'
  if (operation === 'check-in') return 'bookings.check_in'
  if (operation === 'checkout' || operation === 'check-out')
    return ['bookings.checkout', 'bookings.check_out']
  if (operation === 'cancel') return 'bookings.cancel'
  if (operation === 'status') return `${group}.update_status`
  if (operation === 'toggle-active') return `${group}.toggle_active`
  if (operation === 'toggle-available') return `${group}.toggle_available`
  if (operation === 'price') return `${group}.update_price`
  if (operation === 'import') return `${group}.import`
  if (operation === 'depreciation-settings') return 'fixed_assets.update_depreciation_settings'
  const id = data instanceof FormData ? data.get('id') : (data as { id?: unknown } | undefined)?.id
  return `${group}.${id || (idOrAction && /^\d+$/.test(idOrAction)) ? 'update' : 'create'}`
}

// Recheck at request time: also covers stale open forms after another tab changes the session.
export function installAuthorization(
  client: AxiosInstance,
  permissions: () => string[] | undefined,
) {
  client.interceptors.request.use((config) => {
    if (['post', 'put', 'patch', 'delete'].includes(config.method ?? '')) {
      const required = mutationPermission(config.url ?? '', config.data)
      if (required && !hasPermission(permissions(), required))
        throw new Error('You do not have permission to perform this action.')
      const payload = config.data as { deposit?: unknown } | undefined
      if (
        required === 'bookings.create' &&
        payload?.deposit &&
        !hasPermission(permissions(), 'bookings.record_payment')
      ) {
        throw new Error('You do not have permission to record a deposit.')
      }
    }
    return config
  })
}
