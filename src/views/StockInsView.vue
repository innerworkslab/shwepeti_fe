<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()

import AppIcon from '@/components/common/AppIcon.vue'
import { ref } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import StockInFormModal from '@/components/stock-ins/StockInFormModal.vue'
import { useDataTable } from '@/composables/useDataTable'
import { stockInService } from '@/services/stock-in.service'
import type { DataTableColumn } from '@/types/data-table'
import type { StockIn } from '@/types/stock-in'

const columns: DataTableColumn<StockIn>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  {
    key: 'warehouse',
    label: 'Warehouse',
    format: (row) => row.warehouse?.name ?? `Warehouse #${row.warehouse_id}`,
  },
  { key: 'transaction_date', label: 'Transaction date', field: 'transaction_date' },
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
} = useDataTable(stockInService.list)
const modalOpen = ref(false)
const selected = ref<StockIn | null>(null)
const notice = ref('')

function openForm(stockIn: StockIn | null = null) {
  if (!stockIn) {
    void router.push('/stock-ins/create')
    return
  }
  selected.value = stockIn
  notice.value = ''
  modalOpen.value = true
}
function saved() {
  notice.value = selected.value ? 'Stock in status updated.' : 'Stock in created.'
  modalOpen.value = false
  void refresh()
}
function pageSaved() {
  notice.value = 'Saved successfully.'
  void refresh()
}
</script>

<template>
  <section v-show="route.path.replace(/\/+$/, '') === '/stock-ins'">
    <h1>Stock In</h1>
    <p>Record incoming inventory and update transaction status.</p>
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(category: StockIn) => category.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      caption="Stock In"
      search-placeholder="Search stock in…"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #toolbar
        ><button type="button" class="primary" @click="openForm()">
          <AppIcon name="add" :size="16" />Add stock in
        </button></template
      >
      <template #cell-status="{ row }">
        <span
          class="status"
          :class="{ active: row.status === 'posted', cancelled: row.status === 'cancelled' }"
          >{{ row.status ?? '—' }}</span
        >
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <button
            type="button"
            :aria-label="`Update status for stock in #${row.id}`"
            title="Update status"
            class="icon-button"
            @click="openForm(row)"
          >
            <AppIcon name="status" :size="18" />
          </button>
        </div>
      </template>
    </DataTable>
    <StockInFormModal
      v-if="modalOpen"
      :stock-in="selected"
      @close="modalOpen = false"
      @saved="saved"
    />
  </section>
  <RouterView @saved="pageSaved" />
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
.status.cancelled {
  color: #991b1b;
  background: #fef2f2;
}
</style>
