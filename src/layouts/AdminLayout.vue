<script setup lang="ts">
import { reportLinks, reportDefinitions, type AdminReport } from '@/constants/admin-reports'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import type { IconName } from '@/components/common/AppIcon.vue'
import { cashbookService } from '@/services/cashbook.service'
import type { Cashbook } from '@/types/cashbook'
import { env } from '@/config/env'
import { useSessionStore } from '@/stores/session'
import { authService } from '@/services/auth.service'
import { toApiError } from '@/services/api/api-error'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const reportsOpen = ref(false)
function toggleReports() {
  if (!expanded.value) toggleSidebar()
  reportsOpen.value = !reportsOpen.value
}
const links: { to: string; label: string; icon: IconName }[] = [
  { to: '/supplier-ap-balances', label: 'Supplier AP', icon: 'ledger' },
  { to: '/fixed-assets', label: 'Fixed Assets', icon: 'items' },
  { to: '/asset-categories', label: 'Asset Categories', icon: 'categories' },
  { to: '/suppliers', label: 'Suppliers', icon: 'users' },
  { to: '/menus', label: 'Menus', icon: 'menus' },
  { to: '/menu-categories', label: 'Menu categories', icon: 'menuCategories' },
  { to: '/rooms', label: 'Rooms', icon: 'rooms' },
  { to: '/room-categories', label: 'Room categories', icon: 'categories' },
  { to: '/inventory-adjustments', label: 'Adjustments', icon: 'adjustment' },
  { to: '/inventory-transfers', label: 'Transfers', icon: 'transfer' },
  { to: '/stock-ins', label: 'Stock In', icon: 'stockIn' },
  { to: '/warehouses', label: 'Warehouses', icon: 'warehouse' },
  { to: '/inventory-stock-balances', label: 'Stock Balances', icon: 'items' },
  { to: '/inventory-ledgers', label: 'Inventory Ledger', icon: 'ledger' },
  { to: '/items', label: 'Items', icon: 'items' },
  { to: '/item-categories', label: 'Item categories', icon: 'items' },
  { to: '/unit-groups', label: 'Unit groups', icon: 'categories' },
  { to: '/units', label: 'Units', icon: 'items' },
  { to: '/users', label: 'Users', icon: 'users' },
]
const cashbooks = ref<Cashbook[]>([])
const cashbooksOpen = ref(false)
const closingsOpen = ref(false)
function toggleClosings() {
  if (!expanded.value) toggleSidebar()
  closingsOpen.value = !closingsOpen.value
  if (closingsOpen.value) void loadCashbooks()
}
const cashbooksLoading = ref(false)
const cashbooksError = ref('')
const cashbookController = new AbortController()
async function loadCashbooks() {
  cashbooksLoading.value = true
  cashbooksError.value = ''
  try {
    cashbooks.value = await cashbookService.listOptions(cashbookController.signal)
  } catch (error) {
    if (!cashbookController.signal.aborted) cashbooksError.value = toApiError(error).message
  } finally {
    cashbooksLoading.value = false
  }
}
function toggleCashbooks() {
  if (!expanded.value) toggleSidebar()
  cashbooksOpen.value = !cashbooksOpen.value
  if (cashbooksOpen.value) void loadCashbooks()
}
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
  () =>
    links.find((link) => link.to === route.path)?.label ??
    reportDefinitions[route.path.replace('/reports/', '') as AdminReport]?.title ??
    (route.path === '/cashbook-closings'
      ? 'Cashbook Closings'
      : route.path === '/cashbook-transfers'
        ? 'Cashbook Transfers'
        : ['/cashbooks', '/cashbook-transactions'].includes(route.path)
          ? 'Cashbooks'
          : 'Overview'),
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
  () => route.fullPath,
  () => {
    if (mobile.value && mobileOpen.value) closeMobile()
  },
)
onMounted(() => {
  media.addEventListener('change', updateViewport)
  window.addEventListener('keydown', handleEscape)
})
onBeforeUnmount(() => {
  cashbookController.abort()
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
        <span v-if="expanded" class="nav-section-label">Daily operations</span>
        <RouterLink
          v-for="link in ['/rooms', '/menus'].map((path) =>
            links.find((link) => link.to === path)!,
          )"
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
        <span v-if="expanded" class="nav-section-label">Inventory</span>
        <RouterLink
          v-for="link in [
            '/stock-ins',
            '/inventory-transfers',
            '/inventory-adjustments',
            '/inventory-stock-balances',
            '/inventory-ledgers',
            '/items',
            '/warehouses',
          ].map((path) => links.find((link) => link.to === path)!)"
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
        <span v-if="expanded" class="nav-section-label">Finance</span>
        <button
          class="nav-link cashbook-toggle"
          :class="{
            'cashbook-toggle--open': cashbooksOpen && expanded,
            'is-active': ['/cashbooks', '/cashbook-transactions'].includes(route.path),
          }"
          type="button"
          aria-label="Cashbooks"
          title="Cashbooks"
          :aria-expanded="cashbooksOpen"
          aria-controls="cashbook-links"
          @click="toggleCashbooks"
        >
          <AppIcon name="cashbooks" :size="20" /><span v-if="expanded">Cashbooks</span
          ><AppIcon
            v-if="expanded"
            name="chevronDown"
            class="cashbook-chevron"
            :size="16"
            :style="{ transform: cashbooksOpen ? 'rotate(180deg)' : undefined }"
          />
        </button>
        <div v-if="cashbooksOpen && expanded" id="cashbook-links" class="cashbook-links">
          <RouterLink
            class="cashbook-manage"
            :class="{ 'is-active': route.path === '/cashbooks' }"
            to="/cashbooks"
          >
            <AppIcon name="cashbooks" :size="15" /><span>Manage cashbooks</span
            ><AppIcon name="chevronRight" :size="14" />
          </RouterLink>
          <p v-if="cashbooksLoading" class="cashbook-message" role="status">Loading cashbooks…</p>
          <div
            v-else-if="cashbooksError"
            class="cashbook-message cashbook-message--error"
            role="alert"
          >
            {{ cashbooksError
            }}<button type="button" class="cashbook-retry" @click="loadCashbooks">Retry</button>
          </div>
          <template v-else>
            <RouterLink
              v-for="book in cashbooks"
              :key="book.id"
              class="cashbook-link"
              :title="book.name"
              :class="{
                'is-active':
                  route.path === '/cashbook-transactions' &&
                  String(route.query.cashbook_id) === String(book.id),
              }"
              :to="{ path: '/cashbook-transactions', query: { cashbook_id: book.id } }"
              ><span class="cashbook-marker" aria-hidden="true"></span
              ><span class="cashbook-label"
                ><span>{{ book.name }}</span
                ><small>{{ book.code }}</small></span
              ></RouterLink
            >
            <p v-if="!cashbooks.length" class="cashbook-message">No cashbooks found.</p>
          </template>
        </div>
        <RouterLink
          class="nav-link"
          to="/cashbook-transfers"
          :class="{ 'is-active': route.path === '/cashbook-transfers' }"
          ><AppIcon name="cashbooks" /><span v-if="expanded">Cashbook transfers</span></RouterLink
        >
        <div class="closing-group">
          <button
            class="nav-link cashbook-toggle"
            :class="{ 'is-active': route.path === '/cashbook-closings' }"
            :aria-expanded="closingsOpen"
            @click="toggleClosings"
          >
            <AppIcon name="cashbooks" /><span v-if="expanded">Cashbook closings</span
            ><AppIcon v-if="expanded" name="chevronDown" />
          </button>
          <div v-if="closingsOpen && expanded" class="cashbook-links">
            <p v-if="cashbooksLoading">Loading cashbooks…</p>
            <p v-else-if="cashbooksError" role="alert">
              {{ cashbooksError }}<button @click="loadCashbooks">Retry</button>
            </p>
            <RouterLink
              v-for="book in cashbooks"
              :key="book.id"
              class="cashbook-link"
              :to="{ path: '/cashbook-closings', query: { cashbook_id: book.id } }"
              :class="{
                'is-active':
                  route.path === '/cashbook-closings' &&
                  Number(route.query.cashbook_id) === book.id,
              }"
              >{{ book.name }}</RouterLink
            >
          </div>
        </div>
        <RouterLink
          v-for="link in links.filter((link) =>
            ['/suppliers', '/supplier-ap-balances', '/fixed-assets'].includes(link.to),
          )"
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
        <span v-if="expanded" class="nav-section-label">Reports</span>
        <RouterLink
          to="/reports/profit-and-loss"
          class="nav-link"
          :class="{ 'is-active': route.path === '/reports/profit-and-loss' }"
          title="Financial Report"
          ><AppIcon name="ledger" /><span v-if="expanded">Financial Report</span></RouterLink
        >
        <div>
          <button
            class="nav-link cashbook-toggle"
            :class="{ 'is-active': reportLinks.some((link) => link.to === route.path) }"
            :aria-expanded="reportsOpen"
            aria-controls="report-links"
            title="Reports"
            @click="toggleReports"
          >
            <AppIcon name="ledger" /><span v-if="expanded">Reports</span
            ><AppIcon v-if="expanded" name="chevronDown" />
          </button>
          <div v-if="reportsOpen && expanded" id="report-links" class="cashbook-links">
            <RouterLink
              v-for="link in reportLinks"
              :key="link.key"
              :to="link.to"
              class="cashbook-link"
              :class="{ 'is-active': route.path === link.to }"
              >{{ link.title }}</RouterLink
            >
          </div>
        </div>

        <span v-if="expanded" class="nav-section-label">Setup & administration</span>
        <RouterLink
          v-for="link in [
            '/room-categories',
            '/menu-categories',
            '/item-categories',
            '/asset-categories',
            '/unit-groups',
            '/units',
            '/users',
          ].map((path) => links.find((link) => link.to === path)!)"
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
.nav-section-label {
  display: block;
  padding: 20px 14px 7px;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}
.nav-section-label:first-child {
  padding-top: 4px;
}

/* Cashbook group follows the sidebar's navy and warm gold palette. */
.nav-link.cashbook-toggle {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  font-family: inherit;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}
.nav-link.cashbook-toggle:hover,
.nav-link.cashbook-toggle--open {
  background: #24394a;
  border-color: #384d5d;
  color: #f1e1c5;
}
.nav-link.cashbook-toggle.is-active {
  background: #34434a;
  color: #ebce9c;
}
.cashbook-chevron {
  margin-left: auto;
  color: #97aaba;
  transition: transform 180ms ease;
}
.cashbook-links {
  display: grid;
  gap: 4px;
  margin: -1px 0 5px 23px;
  padding: 4px 0 4px 12px;
  border-left: 1px solid #3a4c5b;
  min-width: 0;
}
.cashbook-manage,
.cashbook-link {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  border-radius: 6px;
  padding: 9px 10px;
  color: #b6c3cf;
  text-decoration: none;
  font-size: 12px;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}
.cashbook-manage {
  min-height: 38px;
  margin-bottom: 4px;
  background: #ffffff05;
}
.cashbook-manage svg {
  flex-shrink: 0;
}
.cashbook-manage svg:last-child {
  margin-left: auto;
}
.cashbook-link {
  min-height: 48px;
}
.cashbook-manage:hover,
.cashbook-link:hover {
  background: #283e50;
  color: #fff;
}
.cashbook-manage.is-active,
.cashbook-link.is-active {
  background: #d5b07318;
  color: #f0d4a7;
  box-shadow: inset 2px 0 #d5b073;
}
.cashbook-marker {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border: 1px solid #8399aa;
  border-radius: 50%;
}
.is-active > .cashbook-marker {
  background: #d5b073;
  border-color: #d5b073;
  box-shadow: 0 0 0 3px #d5b07312;
}
.cashbook-label {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.cashbook-label > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cashbook-label small {
  color: #91a5b6;
  font-size: 10px;
  letter-spacing: 0.5px;
  overflow-wrap: anywhere;
}
.cashbook-link.is-active small {
  color: #c8b797;
}
.cashbook-message {
  margin: 0;
  padding: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #a6b7c5;
  overflow-wrap: anywhere;
}
.cashbook-message--error {
  color: #f1b8ad;
}
.cashbook-retry {
  display: block;
  margin-top: 8px;
  border: 1px solid #506170;
  border-radius: 5px;
  padding: 4px 10px;
  background: #24394a;
  color: #f1e1c5;
}
@media (prefers-reduced-motion: reduce) {
  .cashbook-chevron,
  .cashbook-manage,
  .cashbook-link {
    transition: none;
  }
}
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
