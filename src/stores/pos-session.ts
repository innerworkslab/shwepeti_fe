import { defineStore } from 'pinia'
import { ref } from 'vue'
import { setPosAccessToken } from '@/services/api/pos-client'
import { parseLoginResponse } from '@/services/api/auth-response'
import type { User } from '@/types/user'

const storageKey = 'shwe-petit.pos-session'

// Restore synchronously when the store is created, before the router's auth guard
// checks the user and before protected pages send their first API requests.
export const usePosSessionStore = defineStore('pos-session', () => {
  const user = ref<User | null>(null)

  function clearSession() {
    user.value = null
    setPosAccessToken(null)
    try {
      sessionStorage.removeItem(storageKey)
    } catch {
      // The in-memory session can still be cleared when storage is unavailable.
    }
  }

  function setSession(currentUser: User, accessToken: string) {
    const session = parseLoginResponse({
      success: true,
      data: { token_type: 'Bearer', token: accessToken, user: currentUser },
    })
    user.value = session.user
    setPosAccessToken(session.token)
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(session))
    } catch {
      // Login remains usable if the browser blocks storage.
    }
  }

  try {
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
      const session = JSON.parse(stored)
      const restored = parseLoginResponse({
        success: true,
        data: { ...session, token_type: 'Bearer' },
      })
      user.value = restored.user
      setPosAccessToken(restored.token)
    } else setPosAccessToken(null)
  } catch {
    clearSession()
  }

  return { user, setSession, clearSession }
})
