<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { stockBalanceService } from '@/services/stock-balance.service'
import { warehouseService } from '@/services/warehouse.service'
import { itemService } from '@/services/item.service'
import { toApiError } from '@/services/api/api-error'
import type { StockBalance, StockBalanceFilters } from '@/types/stock-balance'
import type { Warehouse } from '@/types/warehouse'
import type { Item } from '@/types/item'
import type { DataTableColumn } from '@/types/data-table'
const columns: DataTableColumn<StockBalance>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  {
    key: 'warehouse',
    label: 'Warehouse',
    format: (row) =>
      row.warehouse?.name ?? (row.warehouse_id == null ? null : `Warehouse #${row.warehouse_id}`),
  },
  {
    key: 'item',
    label: 'Item',
    format: (row) => row.item?.name ?? (row.item_id == null ? null : `Item #${row.item_id}`),
  },
  {
    key: 'unit',
    label: 'Unit',
    format: (row) =>
      row.unit?.name ?? row.unit?.symbol ?? (row.unit_id == null ? null : `Unit #${row.unit_id}`),
  },
  { key: 'quantity', label: 'Quantity', field: 'quantity', align: 'right' },
]
const {
  rows,
  total,
  page,
  perPage,
  loading,
  error,
  filters,
  setPage,
  setPerPage,
  setFilters,
  refresh,
} = useDataTable<StockBalance, StockBalanceFilters>(({ search: _search, ...params }, signal) =>
  stockBalanceService.list(params, signal),
)
const warehouses = ref<Warehouse[]>([])
const items = ref<Item[]>([])
const optionsLoading = ref(false)
const optionsError = ref('')
let controller: AbortController | undefined
let disposed = false
async function loadOptions() {
  if (optionsLoading.value || disposed) return
  controller = new AbortController()
  const active = controller
  optionsLoading.value = true
  optionsError.value = ''
  try {
    const [warehouseOptions, itemOptions] = await Promise.all([
      warehouseService.listOptions(active.signal),
      itemService.listOptions(active.signal),
    ])
    if (disposed || active.signal.aborted) return
    warehouses.value = warehouseOptions
    items.value = itemOptions
  } catch (cause) {
    if (!disposed) {
      optionsError.value = toApiError(cause).message
      active.abort()
    }
  } finally {
    if (!disposed) optionsLoading.value = false
  }
}
function changeFilter(key: keyof StockBalanceFilters, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  setFilters({ [key]: value === '' ? undefined : Number(value) })
}
onMounted(() => void loadOptions())
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
})
</script>
<template>
  <section>
    <h1>Inventory Stock Balances</h1>
    <p>View stock balances by warehouse and item.</p>
    <p v-if="optionsLoading" role="status">Loading filter options...</p>
    <div v-if="optionsError" role="alert" class="error">
      {{ optionsError }} <button type="button" @click="loadOptions">Retry filters</button>
    </div>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(row: StockBalance) => row.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :loading="loading"
      :error="error"
      :searchable="false"
      caption="Inventory Stock Balances"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @refresh="refresh"
    >
      <template #filters>
        <label
          >Warehouse<select
            name="warehouse_id"
            :value="filters.warehouse_id ?? ''"
            :disabled="optionsLoading || !!optionsError"
            @change="changeFilter('warehouse_id', $event)"
          >
            <option value="">All warehouses</option>
            <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
              {{ warehouse.name }}
            </option>
          </select></label
        >
        <label
          >Item<select
            name="item_id"
            :value="filters.item_id ?? ''"
            :disabled="optionsLoading || !!optionsError"
            @change="changeFilter('item_id', $event)"
          >
            <option value="">All items</option>
            <option v-for="item in items" :key="item.id" :value="item.id">
              {{ item.name }} ({{ item.code }})
            </option>
          </select></label
        >
        <button type="button" @click="setFilters({ warehouse_id: undefined, item_id: undefined })">
          Clear filters
        </button>
      </template></DataTable
    >
  </section>
</template>
<style scoped>
label {
  display: grid;
  gap: 0.375rem;
}
select,
button {
  font: inherit;
  color: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
}
select {
  max-width: 100%;
}
button {
  cursor: pointer;
}
:is(select, button):focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.error {
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: #fef2f2;
  color: #991b1b;
}
</style>
