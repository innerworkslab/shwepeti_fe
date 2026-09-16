<script setup lang="ts">
import { ref } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import UserFormModal from '@/components/users/UserFormModal.vue'
import { useDataTable } from '@/composables/useDataTable'
import { userService } from '@/services/user.service'
import type { User } from '@/types/user'
import type { DataTableColumn } from '@/types/data-table'

const columns: DataTableColumn<User>[] = [
  { key: 'name', label: 'Name', field: 'name' },
  { key: 'email', label: 'Email', field: 'email' },
  { key: 'role', label: 'Role', field: 'role' },
  { key: 'actions', label: 'Actions', align: 'right' },
]
const {
  rows,
  total,
  page,
  perPage,
  search,
  loading,
  error,
  setPage,
  setPerPage,
  setSearch,
  refresh,
} = useDataTable(userService.list)
const modalOpen = ref(false)
const selectedId = ref<number | null>(null)
const notice = ref('')

function openForm(id: number | null = null) {
  selectedId.value = id
  notice.value = ''
  modalOpen.value = true
}
function saved() {
  notice.value = selectedId.value != null ? 'User updated.' : 'User created.'
  modalOpen.value = false
  void refresh()
}
</script>

<template>
  <section>
    <h1>Users</h1>
    <p>Manage user accounts and roles.</p>
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(user: User) => user.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      caption="Users"
      search-placeholder="Search users..."
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #toolbar
        ><button type="button" class="primary" @click="openForm()">Add user</button></template
      >
      <template #cell-actions="{ row }"
        ><button type="button" :aria-label="`Edit ${row.name}`" @click="openForm(row.id)">
          Edit
        </button></template
      >
    </DataTable>
    <UserFormModal
      v-if="modalOpen"
      :user-id="selectedId"
      @close="modalOpen = false"
      @saved="saved"
    />
  </section>
</template>

<style scoped>
button {
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: inherit;
  background: white;
  cursor: pointer;
}
button:focus-visible {
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
</style>
