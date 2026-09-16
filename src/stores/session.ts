import { defineStore } from 'pinia'
import { ref } from 'vue'
import { setAccessToken } from '@/services/api/client'
import type { User } from '@/types/user'

// Session stays in memory; a browser refresh requires signing in again.
export const useSessionStore = defineStore('session', () => {
  const user = ref<User | null>(null)

  function setSession(currentUser: User, accessToken: string) {
    user.value = currentUser
    setAccessToken(accessToken)
  }

  function clearSession() {
    user.value = null
    setAccessToken(null)
  }

  return { user, setSession, clearSession }
})
