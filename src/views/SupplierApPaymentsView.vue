<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
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
watch(supplierId, (id) => setFilters({ supplier_id: id }))
</script>
<template>
  <section>
    <RouterLink to="/supplier-ap-balances">Back to Supplier AP</RouterLink>
    <h1>Supplier #{{ route.params.id }} AP Payment History</h1>
    <p>Payment history for this supplier.</p>
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
    />
  </section>
</template>
