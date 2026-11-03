import { nextTick } from 'vue'
import type { Router } from 'vue-router'
// Wait for protected forms to unmount before their leave guards can block logout.
export async function redirectAfterLogout(router: Router, path: '/login' | '/pos/login') {
  await nextTick()
  try {
    await router.replace(path)
  } catch {
    /* Fall back to a fresh page below. */
  }
  if (router.currentRoute.value.path !== path) window.location.replace(router.resolve(path).href)
}
