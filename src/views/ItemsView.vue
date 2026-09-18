<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { ref } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import ItemFormModal from '@/components/items/ItemFormModal.vue'
import { useDataTable } from '@/composables/useDataTable'
import { itemService } from '@/services/item.service'
import type { DataTableColumn } from '@/types/data-table'
import type { Item } from '@/types/item'

const columns: DataTableColumn<Item>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  { key: 'name', label: 'Name', field: 'name' },
  { key: 'code', label: 'Code', field: 'code' },
  {
    key: 'category',
    label: 'Category',
    format: (item) => item.item_category?.name ?? `Category #${item.item_category_id}`,
  },
  {
    key: 'stock_unit',
    label: 'Stock unit',
    format: (item) => item.stock_unit?.name ?? `Unit #${item.stock_unit_id}`,
  },
  { key: 'min_stock', label: 'Minimum stock', field: 'min_stock' },
  { key: 'price', label: 'Price', field: 'price' },
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
} = useDataTable(itemService.list)
const modalOpen = ref(false)
const mode = ref<'edit' | 'status' | 'price'>('edit')
const selected = ref<Item | null>(null)
const notice = ref('')

function openForm(category: Item | null = null, action: 'edit' | 'status' | 'price' = 'edit') {
  mode.value = action
  selected.value = category
  notice.value = ''
  modalOpen.value = true
}
function saved() {
  notice.value =
    mode.value === 'price'
      ? 'Item price updated.'
      : mode.value === 'status'
        ? 'Item status updated.'
        : selected.value
          ? 'Item updated.'
          : 'Item created.'
  modalOpen.value = false
  void refresh()
}
</script>

<template>
  <section>
    <h1>Items</h1>
    <p>Manage inventory items, unit conversions, and prices.</p>
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(category: Item) => category.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      caption="Items"
      search-placeholder="Search items…"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #toolbar
        ><button type="button" class="primary" @click="openForm()">Add item</button></template
      >
      <template #cell-status="{ row }">
        <span class="status" :class="{ active: row.is_active === true }">{{
          row.is_active === undefined ? '—' : row.is_active ? 'Active' : 'Inactive'
        }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <button type="button" :aria-label="`Edit ${row.name}`" @click="openForm(row)">
            Edit
          </button>
          <button
            type="button"
            :aria-label="`Update status for ${row.name}`"
            title="Update status"
            class="icon-button"
            @click="openForm(row, 'status')"
          >
            <AppIcon name="pencil" :size="18" />
          </button>
          <button
            type="button"
            :aria-label="`Update price for ${row.name}`"
            title="Update price"
            class="icon-button"
            @click="openForm(row, 'price')"
          >
            <AppIcon name="price" :size="18" />
          </button>
        </div>
      </template>
    </DataTable>
    <ItemFormModal
      v-if="modalOpen"
      :item-id="selected?.id"
      :mode="mode"
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
