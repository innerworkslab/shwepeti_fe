<script setup lang="ts">
import { posCashbookService, type PosCashbook } from '@/services/pos-cashbook.service'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter, useRoute, RouterLink, RouterView } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import { posAuthService } from '@/services/pos-auth.service'
import { usePosSessionStore } from '@/stores/pos-session'
import { toApiError } from '@/services/api/api-error'
const cashbooks = ref<PosCashbook[]>([])
const cashbooksOpen = ref(false)
const cashbooksLoading = ref(false)
const cashbooksError = ref('')
const cashbookController = new AbortController()
async function loadCashbooks() {
  if (cashbooksLoading.value) return
  cashbooksLoading.value = true
  cashbooksError.value = ''
  try {
    const result = await posCashbookService.list(cashbookController.signal)
    if (!cashbookController.signal.aborted) cashbooks.value = result
  } catch (cause) {
    if (!cashbookController.signal.aborted) cashbooksError.value = toApiError(cause).message
  } finally {
    cashbooksLoading.value = false
  }
}
function toggleCashbooks() {
  cashbooksOpen.value = !cashbooksOpen.value
  if (cashbooksOpen.value) void loadCashbooks()
}
onBeforeUnmount(() => cashbookController.abort())
const router = useRouter()
const session = usePosSessionStore()
const loggingOut = ref(false)
const signedOut = ref(false)
const logoutError = ref('')
async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  logoutError.value = ''
  try {
    try {
      await posAuthService.logout()
    } catch (cause) {
      if (toApiError(cause).status !== 401) throw cause
    }
    session.clearSession()
    signedOut.value = true
    close()
    await nextTick()
    await router.replace('/pos/login')
  } catch (cause) {
    logoutError.value = toApiError(cause).message
  } finally {
    loggingOut.value = false
  }
}
const route = useRoute()
const drawer = ref<HTMLDialogElement | null>(null)
const opened = ref(false)
let previousFocus: HTMLElement | null = null
function open() {
  previousFocus = document.activeElement as HTMLElement
  drawer.value?.showModal()
  opened.value = true
}
function close() {
  drawer.value?.close()
  opened.value = false
  previousFocus?.focus()
}
function backdrop(event: MouseEvent) {
  if (event.target !== drawer.value || !drawer.value) return
  const box = drawer.value.getBoundingClientRect()
  if (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  )
    close()
}
watch(() => route.fullPath, close)
onBeforeUnmount(() => drawer.value?.close())
</script>
<template>
  <div class="pos-layout">
    <div class="pos-navigation">
      <button
        type="button"
        aria-label="Open POS navigation"
        aria-controls="pos-navigation-drawer"
        :aria-expanded="opened"
        @click="open"
      >
        <AppIcon name="expand" :size="20" /> Menu</button
      ><span>SHWE PETIT <strong>POS</strong></span>
      <button class="logout" type="button" :disabled="loggingOut" @click="logout">
        <AppIcon name="logout" :size="18" />{{ loggingOut ? 'Logging out…' : 'Log out' }}
      </button>
    </div>
    <p v-if="logoutError" class="logout-error" role="alert">{{ logoutError }}</p>
    <dialog
      id="pos-navigation-drawer"
      ref="drawer"
      class="navigation-drawer"
      aria-labelledby="pos-nav-title"
      @cancel.prevent="close"
      @click="backdrop"
    >
      <header>
        <div>
          <small>SHWE PETIT</small>
          <h2 id="pos-nav-title">POS workspace</h2>
        </div>
        <button type="button" aria-label="Close POS navigation" @click="close">
          <AppIcon name="close" />
        </button>
      </header>
      <nav aria-label="POS navigation">
        <RouterLink to="/pos" :class="{ active: route.path === '/pos' }" @click="close"
          ><AppIcon name="rooms" />POS Terminal</RouterLink
        ><RouterLink
          to="/pos/bookings"
          :class="{ active: route.path.startsWith('/pos/bookings') }"
          @click="close"
          ><AppIcon name="calendar" />Bookings</RouterLink
        >
        <div class="cashbook-group">
          <button
            class="cashbook-toggle"
            type="button"
            :aria-expanded="cashbooksOpen"
            aria-controls="pos-cashbook-links"
            @click="toggleCashbooks"
          >
            <AppIcon name="cashbooks" />Cashbooks<AppIcon
              name="chevronDown"
              :class="{ rotated: cashbooksOpen }"
            />
          </button>
          <div v-if="cashbooksOpen" id="pos-cashbook-links" class="cashbook-links">
            <RouterLink
              to="/pos/cashbook-closings"
              class="cashbook-manage"
              :class="{ active: route.path === '/pos/cashbook-closings' }"
              @click="close"
              ><AppIcon name="cashbooks" :size="16" />Cashbook closings</RouterLink
            >
            <RouterLink
              to="/pos/cashbook-transfers"
              :class="{ active: route.path === '/pos/cashbook-transfers' }"
              @click="close"
              ><AppIcon name="cashbooks" :size="16" />Cashbook transfers</RouterLink
            >
            <p v-if="cashbooksLoading" role="status">Loading cashbooks…</p>
            <p v-else-if="cashbooksError" role="alert">
              {{ cashbooksError }} <button @click="loadCashbooks">Retry</button>
            </p>
            <template v-else>
              <RouterLink to="/pos/cashbooks" @click="close">All cashbooks</RouterLink>
              <RouterLink
                v-for="book in cashbooks"
                :key="book.id"
                :to="{ path: '/pos/cashbook-transactions', query: { cashbook_id: book.id } }"
                :class="{
                  active:
                    route.path === '/pos/cashbook-transactions' &&
                    Number(route.query.cashbook_id) === book.id,
                }"
                @click="close"
              >
                <AppIcon name="cashbooks" :size="16" /><span
                  >{{ book.name }}<small>{{ book.code }}</small></span
                >
              </RouterLink>
              <p v-if="!cashbooks.length">No cashbooks found.</p>
            </template>
          </div>
        </div>
      </nav>
    </dialog>
    <RouterView v-if="!signedOut" />
  </div>
</template>
<style scoped>
.cashbook-toggle {
  width: 100%;
  padding: 14px;
  background: #183249;
  color: #fff;
  border: 0;
}
.cashbook-toggle > :last-child {
  margin-left: auto;
  transition: transform 0.2s;
}
.rotated {
  transform: rotate(180deg);
}
.cashbook-links {
  margin: 6px 0 0 12px;
  padding-left: 8px;
  border-left: 2px solid #d7b977;
}
.cashbook-links a {
  padding: 10px;
}
.cashbook-links small {
  display: block;
  margin-top: 4px;
  letter-spacing: 0.5px;
}
.cashbook-links p {
  font-size: 13px;
}

.logout {
  margin-left: auto;
}
.logout-error {
  color: #b91c1c;
  padding: 10px 20px;
  margin: 0;
  background: #fff1f2;
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.pos-navigation {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 11px;
  letter-spacing: 1px;
}
button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #dce5ef;
  border-radius: 7px;
  background: white;
  color: #334155;
  cursor: pointer;
}
.navigation-drawer {
  position: fixed;
  inset: 0 auto 0 0;
  margin: 0;
  width: min(310px, 90vw);
  height: 100dvh;
  max-height: 100dvh;
  box-sizing: border-box;
  border: 0;
  padding: 24px;
  color: #263b51;
  box-shadow: 12px 0 40px #0f172a20;
}
.navigation-drawer::backdrop {
  background: #172d4766;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 32px;
}
h2 {
  font-size: 19px;
  margin: 6px 0;
}
small {
  color: #64748b;
  font-size: 10px;
  letter-spacing: 2px;
}
nav {
  display: grid;
  gap: 10px;
}
nav a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 8px;
  color: #475569;
  text-decoration: none;
  font-size: 14px;
}
nav a.active {
  background: #e0f2fe;
  color: #036985;
  font-weight: 600;
}
:is(a, button):focus-visible {
  outline: 2px solid #0ea5e9;
  outline-offset: 3px;
}
</style>
