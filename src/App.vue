<script setup lang="ts">
import { computed, watch } from 'vue'
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
  <RouterView v-if="authorized" />
</template>
