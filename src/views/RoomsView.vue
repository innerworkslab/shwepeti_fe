<script setup lang="ts">
import { roomStatuses, statusLabel, statusStyle } from '@/constants/hotel-status'
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()

import AppIcon from '@/components/common/AppIcon.vue'
import { ref } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import RoomFormModal from '@/components/rooms/RoomFormModal.vue'
import { useDataTable } from '@/composables/useDataTable'
import { roomService } from '@/services/room.service'
import type { RoomListParams } from '@/services/room.service'
import type { DataTableColumn } from '@/types/data-table'
import type { Room } from '@/types/room'

const columns: DataTableColumn<Room>[] = [
  { key: 'name', label: 'Room', field: 'name' },
  {
    key: 'category',
    label: 'Category',
    format: (room) => room.room_category?.name ?? `Category #${room.room_category_id}`,
  },
  { key: 'price', label: 'Price', field: 'price' },
  {
    key: 'beds',
    label: 'Beds',
    format: (room) =>
      room.room_beds
        ?.map((bed) => `${bed.qty} x ${bed.bed_type.replaceAll('_', ' ')}`)
        .join(', ') || '-',
  },
  { key: 'status', label: 'Status', field: 'status' },
  { key: 'actions', label: 'Actions', align: 'right' },
]
const {
  rows,
  total,
  page,
  perPage,
  search,
  filters,
  loading,
  error,
  setPage,
  setPerPage,
  setSearch,
  setFilters,
  reset,
  refresh,
} = useDataTable<Room, Pick<RoomListParams, 'status'>>(roomService.list, {
  initialFilters: { status: undefined },
})
const modalOpen = ref(false)
const selectedId = ref<number | null>(null)
const statusOnly = ref(false)
const notice = ref('')
function openForm(id: number | null = null, status = false) {
  if (!status) {
    void router.push(id != null ? `/rooms/${id}/edit` : '/rooms/create')
    return
  }
  selectedId.value = id
  statusOnly.value = status
  notice.value = ''
  modalOpen.value = true
}
function saved() {
  notice.value = statusOnly.value
    ? 'Room status updated.'
    : selectedId.value != null
      ? 'Room updated.'
      : 'Room created.'
  modalOpen.value = false
  void refresh()
}
function changeStatus(event: Event) {
  setFilters({ status: (event.target as HTMLInputElement).value.trim() || undefined })
}
function pageSaved() {
  notice.value = 'Saved successfully.'
  void refresh()
}
</script>

<template>
  <section v-show="route.path.replace(/\/+$/, '') === '/rooms'">
    <h1>Rooms</h1>
    <p>Manage room categories, pricing, beds, and status.</p>
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(room: Room) => room.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      caption="Rooms"
      search-placeholder="Search rooms..."
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #filters>
        <label class="room-filter"
          >Status
          <select :value="filters.status ?? ''" @change="changeStatus">
            <option value="">All statuses</option>
            <option v-for="status in roomStatuses" :key="status" :value="status">
              {{ statusLabel(status) }}
            </option>
          </select>
        </label>
      </template>
      <template #toolbar
        ><button type="button" @click="reset">Reset</button
        ><button type="button" class="primary" @click="openForm()">
          <AppIcon name="add" :size="16" />Add room
        </button></template
      >
      <template #cell-status="{ row }"
        ><span class="status-badge" :style="statusStyle(row.status || '')">{{
          row.status ? statusLabel(row.status) : '-'
        }}</span></template
      >
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <button
            type="button"
            :aria-label="`Edit ${row.name}`"
            @click="openForm(row.id)"
            :title="`Edit ${row.name}`"
          >
            <AppIcon name="pencil" :size="18" /><span class="action-label">Edit</span>
          </button>
          <button
            type="button"
            :aria-label="`Update status for ${row.name}`"
            title="Update status"
            class="icon-button"
            @click="openForm(row.id, true)"
          >
            <AppIcon name="status" :size="18" />
          </button>
        </div>
      </template>
    </DataTable>
    <RoomFormModal
      v-if="modalOpen"
      :room-id="selectedId"
      :status-only="statusOnly"
      @close="modalOpen = false"
      @saved="saved"
    />
  </section>
  <RouterView @saved="pageSaved" />
</template>

<style scoped>
.status-badge {
  padding: 5px 9px;
  border-radius: 20px;
  font-size: 12px;
  white-space: nowrap;
}
.room-filter {
  display: grid;
  gap: 0.375rem;
}
button,
input {
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: inherit;
  background: white;
}
button {
  cursor: pointer;
}
:is(button, input):focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.primary {
  color: white;
  background: #1d4ed8;
  border-color: #1d4ed8;
}
.notice {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background: #ecfdf5;
  color: #065f46;
}
.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
