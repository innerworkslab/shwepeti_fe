<script setup lang="ts">
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
</script>

<template>
  <section>
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
          <input
            :value="filters.status ?? ''"
            list="room-status-filters"
            placeholder="All statuses"
            @change="changeStatus"
          />
        </label>
        <datalist id="room-status-filters"><option value="cleaning">Cleaning</option></datalist>
      </template>
      <template #toolbar
        ><button type="button" @click="reset">Reset</button
        ><button type="button" class="primary" @click="openForm()">Add room</button></template
      >
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <button type="button" :aria-label="`Edit ${row.name}`" @click="openForm(row.id)">
            Edit
          </button>
          <button
            type="button"
            :aria-label="`Update status for ${row.name}`"
            title="Update status"
            class="icon-button"
            @click="openForm(row.id, true)"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m16 4 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z" />
            </svg>
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
</template>

<style scoped>
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
