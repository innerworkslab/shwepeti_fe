<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, RouterLink, RouterView } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
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
    </div>
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
      </nav>
    </dialog>
    <RouterView />
  </div>
</template>
<style scoped>
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
