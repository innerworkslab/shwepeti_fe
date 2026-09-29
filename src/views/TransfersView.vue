<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()

import AppIcon from '@/components/common/AppIcon.vue'
import { ref } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import TransferFormModal from '@/components/inventory-transfers/TransferFormModal.vue'
import { useDataTable } from '@/composables/useDataTable'
import { transferService } from '@/services/transfer.service'
import type { DataTableColumn } from '@/types/data-table'
import type { Transfer } from '@/types/transfer'

const columns: DataTableColumn<Transfer>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  {
    key: 'from_warehouse',
    label: 'From warehouse',
    format: (row) => row.from_warehouse?.name ?? `Warehouse #${row.from_warehouse_id}`,
  },
  {
    key: 'to_warehouse',
    label: 'To warehouse',
    format: (row) => row.to_warehouse?.name ?? `Warehouse #${row.to_warehouse_id}`,
  },
  { key: 'remark', label: 'Remark', field: 'remark' },
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
} = useDataTable(transferService.list)
const modalOpen = ref(false)
const selected = ref<Transfer | null>(null)
const notice = ref('')

function openForm(transfer: Transfer | null = null) {
  if (!transfer) {
    void router.push('/inventory-transfers/create')
    return
  }
  selected.value = transfer
  notice.value = ''
  modalOpen.value = true
}
function saved() {
  notice.value = selected.value ? 'Transfer status updated.' : 'Transfer created.'
  modalOpen.value = false
  void refresh()
}
function pageSaved() {
  notice.value = 'Saved successfully.'
  void refresh()
}
</script>

<template>
  <section v-show="route.path.replace(/\/+$/, '') === '/inventory-transfers'">
    <h1>Transfers</h1>
    <p>Transfer inventory between warehouses.</p>
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(category: Transfer) => category.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      caption="Transfers"
      search-placeholder="Search transfer…"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #toolbar
        ><button type="button" class="primary" @click="openForm()">
          <AppIcon name="add" :size="16" />Add transfer
        </button></template
      >
      <template #cell-status="{ row }">
        <span class="status" :class="{ active: row.status === 'posted' }">{{
          row.status ?? '—'
        }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <button
            type="button"
            :aria-label="`Update status for transfer #${row.id}`"
            title="Update status"
            class="icon-button"
            @click="openForm(row)"
          >
            <AppIcon name="status" :size="18" />
          </button>
        </div>
      </template>
    </DataTable>
    <TransferFormModal
      v-if="modalOpen"
      :transfer="selected"
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
