<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { useRoute } from 'vue-router'
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { supplierApService } from '@/services/supplier-ap.service'
import type { SupplierApBalance } from '@/types/supplier-ap'
import type { DataTableColumn } from '@/types/data-table'
const route = useRoute()
const columns: DataTableColumn<SupplierApBalance>[] = [
  {
    key: 'supplier',
    label: 'Supplier',
    format: (row) => row.supplier_name ?? row.supplier?.name ?? `Supplier #${row.supplier_id}`,
  },
  {
    key: 'supplier_code',
    label: 'Supplier code',
    format: (row) => row.supplier_code ?? row.supplier?.supplier_code,
  },
  { key: 'supplier_type', label: 'Supplier type', field: 'supplier_type' },
  {
    key: 'credit_limit_amount',
    label: 'Credit limit',
    field: 'credit_limit_amount',
    align: 'right',
  },
  {
    key: 'payable_balance',
    label: 'Payable balance',
    format: (row) => row.payable_balance ?? row.balance_amount,
    align: 'right',
  },
  {
    key: 'available_credit_amount',
    label: 'Available credit',
    field: 'available_credit_amount',
    align: 'right',
  },
  {
    key: 'is_active',
    label: 'Status',
    format: (row) => (row.is_active == null ? null : row.is_active ? 'Active' : 'Inactive'),
  },
  { key: 'actions', label: 'Actions', align: 'right' },
]
const { rows, total, page, perPage, loading, error, setPage, setPerPage, refresh } =
  useDataTable<SupplierApBalance>(({ search: _search, ...params }, signal) =>
    supplierApService.listBalances(params, signal),
  )
</script>
<template>
  <section>
    <h1>Supplier AP</h1>
    <p>Supplier accounts payable balances.</p>
    <p v-if="route.query.saved === 'created'" role="status">Supplier payment created.</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(row: SupplierApBalance) => row.id ?? row.supplier_id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :loading="loading"
      :error="error"
      :searchable="false"
      caption="Supplier AP balances"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @refresh="refresh"
    >
      <template #toolbar
        ><RouterLink class="action primary" to="/supplier-ap-payments/create"
          ><AppIcon name="add" :size="16" />Add payment</RouterLink
        ></template
      >
      <template #cell-actions="{ row }"
        ><RouterLink
          class="action"
          :to="`/suppliers/${row.supplier_id}/ap-ledgers`"
          title="View AP ledger"
          ><AppIcon name="ledger" :size="18" /><span class="action-label"
            >AP ledger</span
          ></RouterLink
        ></template
      >
    </DataTable>
  </section>
</template>
<style scoped>
.action {
  display: inline-flex;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  background: white;
}
.primary {
  color: white;
  background: #1d4ed8;
  border-color: #1d4ed8;
}
.action:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
</style>
