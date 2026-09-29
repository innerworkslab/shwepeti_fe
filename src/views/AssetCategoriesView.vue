<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { onMounted, onBeforeUnmount, ref } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import AssetCategoryFormModal from '@/components/asset-categories/AssetCategoryFormModal.vue'
import { useDataTable } from '@/composables/useDataTable'
import { assetCategoryService } from '@/services/asset-category.service'
import type { DataTableColumn } from '@/types/data-table'
import type { AssetCategory } from '@/types/asset-category'

const columns: DataTableColumn<AssetCategory>[] = [
  { key: 'name', label: 'Name', field: 'name' },
  { key: 'code', label: 'Code', field: 'code' },
  {
    key: 'parent_id',
    label: 'Parent category',
    format: (row) =>
      row.parent_id == null
        ? 'None'
        : (parentCategories.value.find((category) => category.id === row.parent_id)?.name ??
          `#${row.parent_id}`),
  },
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
  setFilters,
  refresh,
} = useDataTable<AssetCategory, { parent_id?: number }>(assetCategoryService.list)
const parentCategories = ref<AssetCategory[]>([])
const parentFilter = ref<number | ''>('')
const optionsLoading = ref(false)
const optionsError = ref('')
let optionsController: AbortController | undefined
let disposed = false
async function loadOptions() {
  optionsController?.abort()
  const active = new AbortController()
  optionsController = active
  optionsLoading.value = true
  optionsError.value = ''
  try {
    const result = await assetCategoryService.listOptions(active.signal)
    if (!disposed && !active.signal.aborted) parentCategories.value = result
  } catch (cause) {
    if (!disposed && !active.signal.aborted)
      optionsError.value =
        cause instanceof Error ? cause.message : 'Could not load parent categories.'
  } finally {
    if (!disposed && !active.signal.aborted) optionsLoading.value = false
  }
}
function filterParent() {
  setFilters({ parent_id: parentFilter.value === '' ? undefined : parentFilter.value })
}
onMounted(() => {
  void loadOptions()
})
onBeforeUnmount(() => {
  disposed = true
  optionsController?.abort()
})
const modalOpen = ref(false)
const statusOnly = ref(false)
const selected = ref<AssetCategory | null>(null)
const notice = ref('')

function openForm(category: AssetCategory | null = null, status = false) {
  statusOnly.value = status
  selected.value = category
  notice.value = ''
  modalOpen.value = true
}
function saved() {
  notice.value = statusOnly.value
    ? 'Asset category status updated.'
    : selected.value
      ? 'Asset category updated.'
      : 'Asset category created.'
  modalOpen.value = false
  void refresh()
  void loadOptions()
}
</script>

<template>
  <section>
    <h1>Asset categories</h1>
    <p>Manage asset category names, codes, parent categories, and status.</p>
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(category: AssetCategory) => category.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      caption="Asset categories"
      search-placeholder="Search categories..."
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #filters>
        <label for="asset-parent-filter"
          >Parent category
          <select
            id="asset-parent-filter"
            name="parent_filter"
            v-model="parentFilter"
            :disabled="optionsLoading || !!optionsError"
            @change="filterParent"
          >
            <option value="">All parents</option>
            <option v-for="category in parentCategories" :key="category.id" :value="category.id">
              {{ category.name }} ({{ category.code }})
            </option>
          </select>
        </label>
        <p v-if="optionsLoading" role="status">Loading parent categories...</p>
        <div v-if="optionsError" role="alert">
          {{ optionsError }}
          <button type="button" @click="loadOptions">Retry parent categories</button>
        </div>
      </template>
      <template #toolbar
        ><button type="button" class="primary" @click="openForm()">
          <AppIcon name="add" :size="16" />Add asset category
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
    <AssetCategoryFormModal
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
select,
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
