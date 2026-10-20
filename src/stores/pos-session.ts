import { defineStore } from 'pinia'
import { setPosAccessToken } from '@/services/api/pos-client'
import { persistentSession } from './persistent-session'

// Restore before route guards and protected API requests run.
export const usePosSessionStore = defineStore('pos-session', () =>
  persistentSession('shwe-petit.pos-session', setPosAccessToken),
)
