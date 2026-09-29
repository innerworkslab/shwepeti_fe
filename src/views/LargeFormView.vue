<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
const props = defineProps<{
  resource:
    'items' | 'menus' | 'rooms' | 'stock-ins' | 'inventory-transfers' | 'inventory-adjustments'
}>()
const emit = defineEmits<{ saved: [] }>()
const route = useRoute()
const router = useRouter()
const form = ref<{ saving: boolean } | null>(null)
const forms = {
  items: defineAsyncComponent(() => import('@/components/items/ItemFormModal.vue')),
  menus: defineAsyncComponent(() => import('@/components/menus/MenuFormModal.vue')),
  rooms: defineAsyncComponent(() => import('@/components/rooms/RoomFormModal.vue')),
  'stock-ins': defineAsyncComponent(() => import('@/components/stock-ins/StockInFormModal.vue')),
  'inventory-transfers': defineAsyncComponent(
    () => import('@/components/inventory-transfers/TransferFormModal.vue'),
  ),
  'inventory-adjustments': defineAsyncComponent(
    () => import('@/components/inventory-transfers/TransferFormModal.vue'),
  ),
}
const id = computed(() => (route.params.id == null ? undefined : Number(route.params.id)))
const invalidId = computed(
  () =>
    id.value != null &&
    (!/^\d+$/.test(String(route.params.id)) || !Number.isSafeInteger(id.value) || id.value < 1),
)
const formProps = computed(() => {
  if (props.resource === 'items') return { page: true, itemId: id.value }
  if (props.resource === 'menus') return { page: true, menuId: id.value }
  if (props.resource === 'rooms') return { page: true, roomId: id.value }
  if (props.resource === 'stock-ins') return { page: true }
  return {
    page: true,
    resourceLabel: props.resource === 'inventory-adjustments' ? 'adjustment' : 'transfer',
  }
})
let finished = false
onBeforeRouteLeave(() => !form.value?.saving || finished)
onBeforeRouteUpdate(() => !form.value?.saving || finished)
function close() {
  if (!form.value?.saving) void router.push(`/${props.resource}`)
}
async function saved() {
  finished = true
  emit('saved')
  await router.push(`/${props.resource}`)
}
</script>
<template>
  <div v-if="invalidId" role="alert">
    <h1>Invalid record ID</h1>
    <RouterLink :to="`/${resource}`">Back to list</RouterLink>
  </div>
  <component
    v-else
    :is="forms[resource]"
    :key="route.fullPath"
    ref="form"
    v-bind="formProps"
    @close="close"
    @saved="saved"
  />
</template>
