export type PermissionRequirement = string | readonly string[]

export function hasPermission(
  permissions: readonly string[] | undefined,
  required: PermissionRequirement,
): boolean {
  return (typeof required === 'string' ? [required] : required).some((p) =>
    permissions?.includes(p),
  )
}

// Route names differ from API permission groups in these few cases.
export function routePermission(path: string): string | null {
  const parts = path
    .replace(/^\/pos(?=\/|$)/, '')
    .split('/')
    .filter(Boolean)
  if (!parts.length) return path.startsWith('/pos') ? 'booking_dashboard.view' : null
  if (['login', 'access-denied'].includes(parts[0]!)) return null
  if (parts[0] === 'reports')
    return parts[1] === 'profit-and-loss' ? 'reports.profit_and_loss' : 'reports.hotel'
  if (parts[0] === 'cashbook-closings') return 'cashbooks.view'
  if (parts[0] === 'suppliers' && parts.includes('ap-payments')) return 'supplier_ap_payments.view'
  if (parts[0] === 'suppliers' && parts.some((p) => p.includes('ledger')))
    return 'supplier_ap_ledgers.view'
  const resource = parts[0]!.replaceAll('-', '_')
  return `${resource}.${parts.includes('create') ? 'create' : parts.includes('edit') ? 'update' : 'view'}`
}
