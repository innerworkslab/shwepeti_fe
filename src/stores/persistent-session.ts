import { onScopeDispose, ref } from 'vue'
import { parseLoginResponse, type LoginResult } from '@/services/api/auth-response'
import type { User } from '@/types/user'

export function persistentSession(key: string, setToken: (token: string | null) => void) {
  const user = ref<User | null>(null)
  const migratedKey = `${key}.migrated`
  function apply(session: LoginResult | null) {
    user.value = session?.user ?? null
    setToken(session?.token ?? null)
  }
  function decode(stored: string | null): LoginResult | null {
    if (!stored) return null
    return parseLoginResponse({
      success: true,
      data: { ...JSON.parse(stored), token_type: 'Bearer' },
    })
  }
  function removeLegacy() {
    try {
      sessionStorage.removeItem(key)
    } catch {
      /* Storage may be unavailable. */
    }
  }
  function clearSession() {
    apply(null)
    try {
      // Prevent an old tab's sessionStorage from restoring a logged-out session.
      localStorage.setItem(migratedKey, '1')
      localStorage.removeItem(key)
    } catch {
      /* The in-memory session is still cleared. */
    }
    removeLegacy()
  }
  function setSession(currentUser: User, accessToken: string) {
    const session = parseLoginResponse({
      success: true,
      data: { token_type: 'Bearer', token: accessToken, user: currentUser },
    })
    apply(session)
    try {
      localStorage.setItem(key, JSON.stringify(session))
      localStorage.setItem(migratedKey, '1')
      removeLegacy()
    } catch {
      /* Login remains usable when browser storage is blocked. */
    }
  }
  try {
    const shared = localStorage.getItem(key)
    if (shared) {
      apply(decode(shared))
      removeLegacy()
    } else if (!localStorage.getItem(migratedKey)) {
      const legacy = decode(sessionStorage.getItem(key))
      if (legacy) setSession(legacy.user, legacy.token)
      else apply(null)
    } else {
      apply(null)
      removeLegacy()
    }
  } catch {
    clearSession()
  }

  function sync(event: StorageEvent) {
    if (event.storageArea !== localStorage || (event.key !== key && event.key !== null)) return
    removeLegacy()
    // Read current storage rather than potentially outdated queued event values.
    try {
      apply(decode(localStorage.getItem(key)))
    } catch {
      apply(null)
    }
  }
  window.addEventListener('storage', sync)
  onScopeDispose(() => window.removeEventListener('storage', sync))
  return { user, setSession, clearSession }
}
