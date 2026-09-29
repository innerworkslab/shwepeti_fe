<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { ref } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import ItemCategoryFormModal from '@/components/item-categories/ItemCategoryFormModal.vue'
import { useDataTable } from '@/composables/useDataTable'
import { itemCategoryService } from '@/services/item-category.service'
import type { DataTableColumn } from '@/types/data-table'
import type { ItemCategory } from '@/types/item-category'

const columns: DataTableColumn<ItemCategory>[] = [
  { key: 'name', label: 'Name', field: 'name' },
  { key: 'code', label: 'Code', field: 'code' },
  { key: 'parent_id', label: 'Parent ID', field: 'parent_id' },
  { key: 'description', label: 'Description', field: 'description' },
  { key: 'status', label: 'Status' },
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
} = useDataTable(itemCategoryService.list)
const modalOpen = ref(false)
const statusOnly = ref(false)
const selected = ref<ItemCategory | null>(null)
const notice = ref('')

function openForm(category: ItemCategory | null = null, status = false) {
  statusOnly.value = status
  selected.value = category
  notice.value = ''
  modalOpen.value = true
}
function saved() {
  notice.value = statusOnly.value
    ? 'Item category status updated.'
    : selected.value
      ? 'Item category updated.'
      : 'Item category created.'
  modalOpen.value = false
  void refresh()
}
</script>

<template>
  <section>
    <h1>Item categories</h1>
    <p>Manage item category names, codes, parent categories, and status.</p>
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(category: ItemCategory) => category.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      caption="Item categories"
      search-placeholder="Search categories..."
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #toolbar
        ><button type="button" class="primary" @click="openForm()">
          <AppIcon name="add" :size="16" />Add item category
        </button></template
      >
      <template #cell-status="{ row }">
        <span class="status" :class="{ active: row.is_active === true }">{{
          row.is_active === undefined ? '-' : row.is_active ? 'Active' : 'Inactive'
        }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <button
            type="button"
            :aria-label="`Edit ${row.name}`"
            @click="openForm(row)"
            :title="`Edit ${row.name}`"
          >
            <AppIcon name="pencil" :size="18" /><span class="action-label">Edit</span>
          </button>
          <button
            type="button"
            :aria-label="`Update status for ${row.name}`"
            title="Update status"
            class="icon-button"
            @click="openForm(row, true)"
          >
            <AppIcon name="status" :size="18" />
          </button>
        </div>
      </template>
    </DataTable>
    <ItemCategoryFormModal
      v-if="modalOpen"
      :category="selected"
      :status-only="statusOnly"
      @close="modalOpen = false"
      @saved="saved"
    />
  </section>
</template>

<style scoped>
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
.status {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: #f1f5f9;
  font-size: 0.875rem;
}
.status.active {
  color: #065f46;
  background: #ecfdf5;
}
</style>
