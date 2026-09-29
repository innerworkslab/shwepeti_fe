<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { supplierApService } from '@/services/supplier-ap.service'
import type { SupplierApLedger } from '@/types/supplier-ap'
import type { DataTableColumn } from '@/types/data-table'
const route = useRoute()
const supplierId = computed(() => Number(route.params.id))
const columns: DataTableColumn<SupplierApLedger>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  { key: 'transaction_date', label: 'Date', field: 'transaction_date' },
  { key: 'transaction_type', label: 'Type', field: 'transaction_type' },
  { key: 'debit_amount', label: 'Debit', field: 'debit_amount', align: 'right' },
  { key: 'credit_amount', label: 'Credit', field: 'credit_amount', align: 'right' },
  { key: 'balance_amount', label: 'Balance', field: 'balance_amount', align: 'right' },
  { key: 'reference_type', label: 'Reference type', field: 'reference_type' },
  { key: 'reference_id', label: 'Reference ID', field: 'reference_id' },
  { key: 'remark', label: 'Remark', field: 'remark' },
]
const { rows, total, page, perPage, loading, error, setPage, setPerPage, setFilters, refresh } =
  useDataTable<SupplierApLedger, { supplier_id: number }>(
    ({ search: _search, ...params }, signal) => {
      if (!Number.isSafeInteger(params.supplier_id) || params.supplier_id < 1)
        throw new Error('Invalid supplier ID.')
      return supplierApService.listLedgers(params, signal)
    },
    { initialFilters: { supplier_id: supplierId.value } },
  )
watch(supplierId, (id) => setFilters({ supplier_id: id }))
</script>
<template>
  <section>
    <RouterLink to="/suppliers">Back to suppliers</RouterLink>
    <h1>Supplier #{{ route.params.id }} AP Ledger</h1>
    <p>Accounts payable transactions for this supplier.</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(row: SupplierApLedger) => row.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :loading="loading"
      :error="error"
      :searchable="false"
      caption="Supplier AP ledger"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @refresh="refresh"
    />
  </section>
</template>
