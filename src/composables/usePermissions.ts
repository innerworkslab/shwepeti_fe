import { useRoute } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { usePosSessionStore } from '@/stores/pos-session'
import { hasPermission, routePermission, type PermissionRequirement } from '@/utils/permissions'

export function usePermissions() {
  const route = useRoute()
  const admin = useSessionStore()
  const pos = usePosSessionStore()
  const can = (permission: PermissionRequirement) =>
    hasPermission((route.path.startsWith('/pos') ? pos : admin).user?.permissions, permission)
  const canVisit = (path: string) => {
    const required = routePermission(path)
    return !required || can(required)
  }
  return { can, canVisit }
}
