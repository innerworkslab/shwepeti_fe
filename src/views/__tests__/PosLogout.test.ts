import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import PosLayout from '@/layouts/PosLayout.vue'
import { usePosSessionStore } from '@/stores/pos-session'
import { posAuthService } from '@/services/pos-auth.service'
import { posApiClient } from '@/services/api/pos-client'
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear() })
it('posts logout, clears the POS session and redirects to POS login', async () => {
 const pinia = createPinia()
 const session = usePosSessionStore(pinia)
 session.setSession({ id: 2, name: 'Staff', email: 'staff@example.com', role: 'restaurant_administrator' }, 'test-token')
 sessionStorage.setItem('shwe-petit.session', 'admin-session-kept')
 const post = vi.spyOn(posApiClient, 'post').mockResolvedValue({ data: { success: true } })
 const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/pos', component: { template: '<div />' } }, { path: '/pos/login', component: { template: '<div />' } }] })
 await router.push('/pos')
 const w = mount(PosLayout, { global: { plugins: [pinia, router] } })
 // jsdom does not implement the native dialog close method.
 Object.defineProperty(w.get('dialog').element, 'close', { value() {} })
 await w.get('button.logout').trigger('click'); await flushPromises()
 expect(post).toHaveBeenCalledExactlyOnceWith('/logout')
 expect(session.user).toBeNull(); expect(sessionStorage.getItem('shwe-petit.pos-session')).toBeNull()
 expect(posApiClient.defaults.headers.common.Authorization).toBeUndefined()
 expect(sessionStorage.getItem('shwe-petit.session')).toBe('admin-session-kept')
 expect(router.currentRoute.value.path).toBe('/pos/login')
 w.unmount()
})
it('rejects an unsuccessful logout response', async () => {
 vi.spyOn(posApiClient, 'post').mockResolvedValue({ data: { success: false, message: 'Try again' } })
 await expect(posAuthService.logout()).rejects.toThrow('Try again')
})
