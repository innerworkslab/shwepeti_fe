<script setup lang="ts">
import { computed, watch } from 'vue'
import { hasPermission, routePermission } from '@/utils/permissions'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { usePosSessionStore } from '@/stores/pos-session'
const route = useRoute()
const router = useRouter()
const admin = useSessionStore()
const pos = usePosSessionStore()
const authorized = computed(
  () => (!route.meta.requiresAuth || !!admin.user) && (!route.meta.requiresPosAuth || !!pos.user),
)
const permitted = computed(() => {
  if (!route.meta.requiresAuth && !route.meta.requiresPosAuth) return true
  const required = routePermission(route.path)
  return (
    !required ||
    hasPermission((route.meta.requiresPosAuth ? pos : admin).user?.permissions, required)
  )
})
watch(
  permitted,
  (allowed) => {
    if (!allowed && authorized.value)
      void router.replace(route.meta.requiresPosAuth ? '/pos/access-denied' : '/access-denied')
  },
  { flush: 'post' },
)

watch(
  authorized,
  (allowed) => {
    if (!allowed) {
      const path = route.meta.requiresPosAuth ? '/pos/login' : '/login'
      // Layout logout owns its redirect. Storage events in other tabs still land here.
      if (router.currentRoute.value.path !== path) void router.replace(path)
    }
  },
  { flush: 'post' },
)
</script>
<template>
  <RouterView v-if="authorized && permitted" />
</template>
