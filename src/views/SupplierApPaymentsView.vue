<script setup lang="ts">
import { computed, watch, ref, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import { toApiError } from '@/services/api/api-error'
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { supplierApService } from '@/services/supplier-ap.service'
import type { SupplierApPayment } from '@/types/supplier-ap'
import type { DataTableColumn } from '@/types/data-table'
const route = useRoute()
const supplierId = computed(() => Number(route.params.id))
const columns: DataTableColumn<SupplierApPayment>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  { key: 'reference_no', label: 'Reference', field: 'reference_no' },
  {
    key: 'supplier',
    label: 'Supplier',
    format: (row) => row.supplier?.name ?? `#${row.supplier_id}`,
  },
  {
    key: 'cashbook',
    label: 'Cashbook',
    format: (row) => row.cashbook?.name ?? `#${row.cashbook_id}`,
  },
  { key: 'amount', label: 'Amount', field: 'amount', align: 'right' },
  { key: 'payment_date', label: 'Payment date', field: 'payment_date' },
  { key: 'status', label: 'Status', field: 'status' },
  { key: 'remark', label: 'Remark', field: 'remark' },
  { key: 'creator', label: 'Created by', format: (row) => row.creator?.name },
  { key: 'created_at', label: 'Created at', field: 'created_at' },
  { key: 'updated_at', label: 'Updated at', field: 'updated_at' },
  { key: 'actions', label: 'Actions', align: 'right' },
]
const { rows, total, page, perPage, loading, error, setPage, setPerPage, setFilters, refresh } =
  useDataTable<SupplierApPayment, { supplier_id: number }>(
    ({ search: _search, ...params }, signal) => {
      if (!Number.isSafeInteger(params.supplier_id) || params.supplier_id < 1)
        throw new Error('Invalid supplier ID.')
      return supplierApService.listPayments(params, signal)
    },
    { initialFilters: { supplier_id: supplierId.value } },
  )
const postingId = ref<number | null>(null)
const statusError = ref('')
const notice = ref('')
let disposed = false
onBeforeUnmount(() => {
  disposed = true
})
async function postPayment(row: SupplierApPayment) {
  if (postingId.value !== null || row.status !== 'draft') return
  const supplier = supplierId.value
  postingId.value = row.id
  statusError.value = ''
  notice.value = ''
  try {
    await supplierApService.updatePaymentStatus(row.id, { status: 'posted' })
    if (!disposed && supplier === supplierId.value) {
      row.status = 'posted'
      notice.value = 'Payment posted successfully.'
      await refresh()
    }
  } catch (cause) {
    if (!disposed && supplier === supplierId.value) statusError.value = toApiError(cause).message
  } finally {
    if (!disposed) postingId.value = null
  }
}
watch(supplierId, () => {
  statusError.value = ''
  notice.value = ''
})
watch(supplierId, (id) => setFilters({ supplier_id: id }))
</script>
<template>
  <section>
    <RouterLink to="/supplier-ap-balances">Back to Supplier AP</RouterLink>
    <h1>Supplier #{{ route.params.id }} AP Payment History</h1>
    <p>Payment history for this supplier.</p>
    <p v-if="statusError" role="alert">{{ statusError }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(row: SupplierApPayment) => row.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :loading="loading"
      :error="error"
      :searchable="false"
      caption="Supplier AP payment history"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @refresh="refresh"
    >
      <template #cell-actions="{ row }">
        <button
          v-if="row.status === 'draft'"
          class="post-payment"
          type="button"
          :disabled="postingId !== null"
          :aria-label="`Post payment #${row.id}`"
          title="Post payment"
          @click="postPayment(row)"
        >
          <AppIcon name="availability" :size="18" /><span>{{
            postingId === row.id ? 'Posting…' : 'Post payment'
          }}</span>
        </button>
        <span v-else>—</span>
      </template>
    </DataTable>
  </section>
</template>

<style scoped>
.post-payment {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #183249;
  color: white;
  white-space: nowrap;
  cursor: pointer;
}
.post-payment:disabled {
  opacity: 0.5;
  cursor: wait;
}
[role='alert'] {
  color: #b91c1c;
}
</style>
