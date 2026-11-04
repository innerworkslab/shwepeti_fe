<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import UserForm from '@/components/users/UserFormModal.vue'
const route = useRoute()
const router = useRouter()
const form = ref<{ saving: boolean } | null>(null)
const finished = ref(false)
const id = computed(() => (route.params.id == null ? undefined : Number(route.params.id)))
const valid = computed(
  () => id.value === undefined || (Number.isSafeInteger(id.value) && id.value > 0),
)
onBeforeRouteLeave(() => !form.value?.saving || finished.value)
function saved() {
  finished.value = true
  void router.push('/users')
}
</script>
<template>
  <UserForm
    v-if="valid"
    :key="id ?? 'create'"
    ref="form"
    :user-id="id"
    @close="router.push('/users')"
    @saved="saved"
  />
  <p v-else role="alert">Invalid user ID.</p>
</template>
