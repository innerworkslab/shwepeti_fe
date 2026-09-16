<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import type { IconName } from '@/components/common/AppIcon.vue'
import { env } from '@/config/env'
import { useSessionStore } from '@/stores/session'
import { authService } from '@/services/auth.service'
import { toApiError } from '@/services/api/api-error'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const links: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/rooms', label: 'Rooms', icon: 'rooms' },
  { to: '/room-categories', label: 'Room categories', icon: 'categories' },
  { to: '/item-categories', label: 'Item categories', icon: 'items' },
  { to: '/users', label: 'Users', icon: 'users' },
]
const media = window.matchMedia('(max-width: 760px)')
const mobile = ref(media.matches)
const mobileOpen = ref(false)
const desktopCollapsed = ref(false)
const toggleButton = ref<HTMLButtonElement | null>(null)
const loggingOut = ref(false)
const logoutError = ref('')
try {
  desktopCollapsed.value = localStorage.getItem('shwe-petit.sidebar-collapsed') === 'true'
} catch {
  /* Storage may be unavailable. */
}
const expanded = computed(() => (mobile.value ? mobileOpen.value : !desktopCollapsed.value))
const currentPage = computed(
  () => links.find((link) => link.to === route.path)?.label ?? 'Overview',
)
const displayName = computed(() => session.user?.name || 'User')
const displayRole = computed(
  () => session.user?.role.replaceAll('_', ' ') || 'Hotel administration',
)

function toggleSidebar() {
  if (mobile.value) mobileOpen.value = !mobileOpen.value
  else {
    desktopCollapsed.value = !desktopCollapsed.value
    try {
      localStorage.setItem('shwe-petit.sidebar-collapsed', String(desktopCollapsed.value))
    } catch {
      /* Keep the preference for this mount. */
    }
  }
}
function closeMobile() {
  mobileOpen.value = false
  toggleButton.value?.focus()
}
function updateViewport(event: MediaQueryListEvent) {
  mobile.value = event.matches
  mobileOpen.value = false
}
function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && mobile.value && mobileOpen.value) closeMobile()
}
watch(
  () => route.path,
  () => {
    if (mobile.value && mobileOpen.value) closeMobile()
  },
)
onMounted(() => {
  media.addEventListener('change', updateViewport)
  window.addEventListener('keydown', handleEscape)
})
onBeforeUnmount(() => {
  media.removeEventListener('change', updateViewport)
  window.removeEventListener('keydown', handleEscape)
})

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  logoutError.value = ''
  try {
    await authService.logout()
    session.clearSession()
    await router.replace({ name: 'login' })
  } catch (cause) {
    logoutError.value = toApiError(cause).message
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="admin-layout" :class="{ 'is-expanded': expanded }">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="topbar">
      <RouterLink to="/" class="brand" :aria-label="`${env.appName} home`">
        <span class="brand-mark" aria-hidden="true">sp<span class="brand-star">✦</span></span>
        <span class="brand-wordmark"
          ><strong>SHWE PETIT</strong><small>HOTEL MANAGEMENT</small></span
        >
      </RouterLink>
      <div class="account">
        <div class="user-profile">
          <span class="avatar"><AppIcon name="user" /></span>
          <span class="user-details"
            ><strong>{{ displayName }}</strong
            ><small>{{ displayRole }}</small></span
          >
        </div>
        <span class="account-divider" aria-hidden="true"></span>
        <button class="logout-button" type="button" :disabled="loggingOut" @click="logout">
          <AppIcon name="logout" /><span>{{ loggingOut ? 'Signing out...' : 'Log out' }}</span>
        </button>
      </div>
    </header>

    <aside
      id="admin-sidebar"
      class="sidebar"
      :class="{ 'sidebar--expanded': expanded }"
      aria-label="Sidebar"
    >
      <div class="sidebar-heading">
        <span v-if="expanded" class="section-label">WORKSPACE</span>
        <button
          ref="toggleButton"
          type="button"
          class="sidebar-toggle"
          :aria-label="expanded ? 'Collapse sidebar' : 'Expand sidebar'"
          :title="expanded ? 'Collapse sidebar' : 'Expand sidebar'"
          :aria-expanded="expanded"
          aria-controls="sidebar-navigation"
          @click="toggleSidebar"
        >
          <AppIcon :name="expanded ? 'collapse' : 'expand'" />
        </button>
      </div>
      <nav id="sidebar-navigation" aria-label="Main navigation">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ 'is-active': route.path === link.to }"
          :aria-label="link.label"
          :title="!expanded ? link.label : undefined"
        >
          <AppIcon :name="link.icon" />
          <span v-if="expanded">{{ link.label }}</span>
          <span
            v-if="expanded && route.path === link.to"
            class="active-dot"
            aria-hidden="true"
          ></span>
        </RouterLink>
      </nav>
      <div v-if="expanded" class="sidebar-footer">
        <span class="footer-mark" aria-hidden="true">✦</span
        ><span>Every stay, thoughtfully managed.</span>
      </div>
    </aside>
    <button
      v-if="mobile && mobileOpen"
      class="sidebar-backdrop"
      type="button"
      aria-label="Close sidebar"
      @click="closeMobile"
    ></button>

    <main id="main-content" class="main-content" tabindex="-1">
      <div class="page-context">
        <span>Workspace</span><span aria-hidden="true">/</span><strong>{{ currentPage }}</strong>
      </div>
      <p v-if="logoutError" role="alert" class="logout-error">{{ logoutError }}</p>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  --sidebar-width: 76px;
  --topbar-height: 80px;
  min-height: 100dvh;
  background: #f7f8fa;
}
.admin-layout.is-expanded {
  --sidebar-width: 248px;
}
.topbar {
  height: var(--topbar-height);
  position: fixed;
  inset: 0 0 auto;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 30px 0 24px;
  background: white;
  border-bottom: 1px solid #e6e9ee;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #172638;
  text-decoration: none;
  flex-shrink: 0;
}
.brand-mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 42px;
  height: 44px;
  background: #192c3b;
  border-radius: 10px 10px 10px 2px;
  color: #e4c590;
  font:
    italic 29px Georgia,
    serif;
  letter-spacing: -3px;
  padding-right: 4px;
}
.brand-star {
  position: absolute;
  right: 5px;
  top: 1px;
  font: 12px serif;
}
.brand-wordmark {
  display: grid;
  gap: 4px;
}
.brand-wordmark strong {
  font:
    600 17px Georgia,
    serif;
  letter-spacing: 2px;
}
.brand-wordmark small {
  font-size: 8px;
  letter-spacing: 2px;
  color: #7d8996;
}
.account,
.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}
.account {
  gap: 22px;
}
.avatar {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid #dfd4bf;
  border-radius: 50%;
  background: #f7f2e9;
  color: #947440;
}
.user-details {
  display: grid;
  gap: 4px;
  max-width: 220px;
}
.user-details strong {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-details small {
  font-size: 11px;
  color: #788596;
  text-transform: capitalize;
}
.account-divider {
  height: 28px;
  width: 1px;
  background: #e6e9ee;
}
button {
  font: inherit;
  cursor: pointer;
}
.logout-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e3e7ec;
  padding: 9px 12px;
  border-radius: 7px;
  color: #596675;
  background: white;
  font-size: 12px;
  font-weight: 600;
}
.logout-button:hover {
  color: #9f352e;
  background: #fff8f7;
  border-color: #edd5d1;
}
.logout-button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.sidebar {
  position: fixed;
  top: var(--topbar-height);
  bottom: 0;
  left: 0;
  width: var(--sidebar-width);
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: #192b3b;
  color: #c0cbd6;
  padding: 23px 13px 20px;
  transition: width 180ms ease;
  overflow-y: auto;
}
.sidebar-heading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  margin-bottom: 23px;
}
.sidebar--expanded .sidebar-heading {
  justify-content: space-between;
  padding-left: 13px;
}
.section-label {
  color: #8395a5;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 2px;
}
.sidebar-toggle {
  background: transparent;
  color: #9cacbb;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid #3a4a58;
  border-radius: 6px;
}
.sidebar-toggle:hover {
  background: #2b3c4c;
  color: white;
}
nav {
  display: grid;
  gap: 7px;
}
.nav-link {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
  border-radius: 7px;
  color: #b6c3cf;
  text-decoration: none;
  font-size: 13px;
  white-space: nowrap;
}
.nav-link svg {
  flex-shrink: 0;
}
.sidebar--expanded .nav-link {
  justify-content: flex-start;
  padding: 0 14px;
}
.nav-link:hover {
  background: #24394a;
  color: #fff;
}
.nav-link.is-active {
  background: #34434a;
  color: #ebce9c;
  box-shadow: inset 2px 0 #d5b073;
}
.active-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #d5b073;
  margin-left: auto;
}
.sidebar-footer {
  margin-top: auto;
  padding: 32px 15px 0;
  display: flex;
  gap: 10px;
  color: #8194a5;
  font-size: 11px;
  line-height: 1.7;
}
.footer-mark {
  font-size: 20px;
  color: #aa9065;
}
.main-content {
  min-width: 0;
  margin-left: var(--sidebar-width);
  padding: calc(var(--topbar-height) + 28px) 36px 40px;
  transition: margin-left 180ms ease;
}
.page-context {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
  font-size: 11px;
  color: #94a0ad;
}
.page-context strong {
  color: #536373;
  font-weight: 500;
}
.main-content :deep(h1) {
  font-size: 26px;
  letter-spacing: -0.7px;
  color: #192b3b;
  margin-top: 0;
}
.logout-error {
  color: #b91c1c;
}
.skip-link {
  position: fixed;
  left: 16px;
  top: -80px;
  z-index: 50;
  padding: 12px;
  background: white;
}
.skip-link:focus {
  top: 8px;
}
:is(button, a):focus-visible {
  outline: 2px solid #b78d4c;
  outline-offset: 4px;
}
.sidebar-backdrop {
  position: fixed;
  inset: var(--topbar-height) 0 0;
  z-index: 15;
  border: 0;
  background: #0f172a66;
}
@media (max-width: 760px) {
  .admin-layout {
    --topbar-height: 68px;
    --sidebar-width: 64px;
  }
  .admin-layout.is-expanded {
    --sidebar-width: 238px;
  }
  .topbar {
    padding: 0 14px;
  }
  .brand-wordmark {
    display: none;
  }
  .account {
    gap: 12px;
  }
  .account-divider,
  .user-details small {
    display: none;
  }
  .user-details {
    max-width: 100px;
  }
  .avatar {
    width: 34px;
    height: 34px;
  }
  .sidebar {
    padding-inline: 8px;
  }
  .main-content {
    margin-left: 64px;
    padding: calc(var(--topbar-height) + 20px) 16px 24px;
  }
  .main-content :deep(h1) {
    font-size: 23px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .main-content {
    transition: none;
  }
}
</style>
