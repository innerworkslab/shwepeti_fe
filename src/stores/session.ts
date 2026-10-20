import { defineStore } from 'pinia'
import { setAccessToken } from '@/services/api/client'
import { persistentSession } from './persistent-session'

// Restore before route guards and protected API requests run.
export const useSessionStore = defineStore('session', () =>
  persistentSession('shwe-petit.session', setAccessToken),
)
