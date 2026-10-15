<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { stockBalanceService } from '@/services/stock-balance.service'
import { warehouseService } from '@/services/warehouse.service'
import { toApiError } from '@/services/api/api-error'
import type { StockBalance, StockBalanceFilters } from '@/types/stock-balance'
import type { Warehouse } from '@/types/warehouse'
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
      row.item?.stock_unit?.name ??
      row.unit?.name ??
      row.unit?.symbol ??
      (row.unit_id == null ? null : `Unit #${row.unit_id}`),
  },
  ...(
    [
      'opening_balance',
      'in_balance',
      'out_balance',
      'closing_balance',
      'reserved_quantity',
      'available_quantity',
    ] as const
  ).map((key) => ({ key, label: key.replaceAll('_', ' '), field: key, align: 'right' as const })),
  { key: 'code', label: 'Item code', format: (row: StockBalance) => row.item?.code },
  { key: 'sku', label: 'SKU', format: (row: StockBalance) => row.item?.sku },
  { key: 'min_stock', label: 'Minimum stock', format: (row: StockBalance) => row.item?.min_stock },
  { key: 'updated_at', label: 'Updated at', field: 'updated_at' },
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
    const warehouseOptions = await warehouseService.listOptions(active.signal)
    if (disposed || active.signal.aborted) return
    warehouses.value = warehouseOptions
  } catch (cause) {
    if (!disposed) {
      optionsError.value = toApiError(cause).message
      active.abort()
    }
  } finally {
    if (!disposed) optionsLoading.value = false
  }
}
const dates = reactive({ date_from: '', date_to: '' })
const dateError = ref('')
function applyDates() {
  dateError.value = ''
  if (dates.date_from && dates.date_to && dates.date_from > dates.date_to) {
    dateError.value = 'From date must be on or before to date.'
    return
  }
  setFilters({ date_from: dates.date_from || undefined, date_to: dates.date_to || undefined })
}
function clearFilters() {
  dates.date_from = ''
  dates.date_to = ''
  dateError.value = ''
  setFilters({ warehouse_id: undefined, date_from: undefined, date_to: undefined })
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
    <p>View stock balances by warehouse and date.</p>
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
        <form @submit.prevent="applyDates" class="date-filters">
          <label>From date<input type="date" name="date_from" v-model="dates.date_from" /></label>
          <label>To date<input type="date" name="date_to" v-model="dates.date_to" /></label>
          <button type="submit">Apply dates</button
          ><button type="button" @click="clearFilters">Clear filters</button>
          <p v-if="dateError" role="alert">{{ dateError }}</p>
        </form>
      </template></DataTable
    >
  </section>
</template>
<style scoped>
.date-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: end;
}
input {
  font: inherit;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}
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
