<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t } from '@/i18n'
import { usePermissions } from '@/composables/usePermissions'
import { useDataTable } from '@/composables/useDataTable'
import { posRoomManagement } from '@/services/pos-room-management.service'
import DataTable from '@/components/common/DataTable.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import RoomFormModal from '@/components/rooms/RoomFormModal.vue'
import RoomDrawer from '@/components/pos/RoomDrawer.vue'
import type { Room } from '@/types/room'
import type { DataTableColumn } from '@/types/data-table'
const route = useRoute(),
  router = useRouter()
const { can } = usePermissions()
const editing = computed(() => route.path.endsWith('/edit'))
const formPage = computed(() => editing.value || route.path.endsWith('/create'))
const statusId = ref<number | null>(null),
  detailId = ref<number | null>(null)
const date = ref(''),
  available = ref(false),
  status = ref('')
const statuses = [
  'available',
  'occupied',
  'reserved',
  'dirty',
  'maintenance',
  'cleaning',
  'out_of_service',
]
const columns: DataTableColumn<Room>[] = [
  { key: 'name', label: 'Room', field: 'name' },
  { key: 'category', label: 'Category', format: (r) => r.room_category?.name },
  { key: 'price', label: 'Price', field: 'price' },
  { key: 'status', label: 'Status', field: 'status' },
  { key: 'actions', label: 'Actions' },
]
const { rows, total, page, perPage, loading, error, setPage, setPerPage, setFilters, refresh } =
  useDataTable<Room, { date?: string; available?: boolean; status?: string }>(
    ({ search: _search, ...params }, signal) => posRoomManagement.list(params, signal),
  )
function apply() {
  setFilters({
    date: date.value || undefined,
    available: available.value,
    status: status.value || undefined,
  })
}
async function saved() {
  statusId.value = null
  await router.push('/pos/rooms')
  await refresh()
}
</script>
<template>
  <main class="pos-rooms">
    <template v-if="formPage">
      <RoomFormModal
        :key="route.path"
        :pos="true"
        :page="true"
        :room-id="editing ? Number(route.params.id) : null"
        @close="router.push('/pos/rooms')"
        @saved="saved"
      />
    </template>
    <template v-else>
      <h1>{{ t('Rooms') }}</h1>
      <DataTable
        :rows="rows"
        :columns="columns"
        :row-key="(r) => r.id"
        :total="total"
        :page="page"
        :per-page="perPage"
        :loading="loading"
        :error="error"
        :searchable="false"
        :caption="t('Rooms')"
        @update:page="setPage"
        @update:per-page="setPerPage"
        @refresh="refresh"
      >
        <template #toolbar
          ><button v-if="can('rooms.create')" @click="router.push('/pos/rooms/create')">
            <AppIcon name="add" />{{ t('Add room') }}
          </button></template
        >
        <template #filters
          ><form @submit.prevent="apply">
            <label>{{ t('Date') }}<input v-model="date" type="date" name="date" /></label
            ><label
              >{{ t('Status')
              }}<select v-model="status" name="status">
                <option value="">{{ t('All statuses') }}</option>
                <option v-for="value in statuses" :key="value" :value="value">
                  {{ t(value.replaceAll('_', ' ')) }}
                </option>
              </select></label
            ><label><input v-model="available" type="checkbox" />{{ t('Available rooms') }}</label
            ><button>{{ t('Apply filters') }}</button>
          </form></template
        >
        <template #cell-actions="{ row }">
          <button :title="t('View details')" @click="detailId = row.id">
            <AppIcon name="availability" />
          </button>
          <button
            v-if="can('rooms.update')"
            :title="t('Edit room')"
            @click="router.push(`/pos/rooms/${row.id}/edit`)"
          >
            <AppIcon name="pencil" />
          </button>
          <button
            v-if="can('rooms.update_status')"
            :title="t('Update status')"
            @click="statusId = row.id"
          >
            <AppIcon name="status" />
          </button>
        </template>
      </DataTable>
      <RoomFormModal
        v-if="statusId != null"
        :pos="true"
        :room-id="statusId"
        :status-only="true"
        @close="statusId = null"
        @saved="saved"
      />
      <RoomDrawer v-if="detailId != null" :room-id="detailId" @close="detailId = null" />
    </template>
  </main>
</template>
<style scoped>
.pos-rooms {
  padding: 24px;
}
form {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
label {
  display: flex;
  gap: 8px;
  align-items: center;
}
button,
input {
  font: inherit;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: white;
}
button {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
