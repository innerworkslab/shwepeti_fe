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
watch(authorized, (allowed) => {
  if (!allowed)
    void router.replace({
      name: route.meta.requiresPosAuth ? 'pos-login' : 'login',
      query: { redirect: route.fullPath },
    })
})
</script>
<template>
  <RouterView v-if="authorized" />
</template>
