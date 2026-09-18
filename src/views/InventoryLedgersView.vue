<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { inventoryLedgerService } from '@/services/inventory-ledger.service'
import type { InventoryLedger } from '@/types/inventory-ledger'
import type { DataTableColumn } from '@/types/data-table'
const columns: DataTableColumn<InventoryLedger>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  { key: 'transaction_type', label: 'Type', field: 'transaction_type' },
  { key: 'transaction_date', label: 'Transaction date', field: 'transaction_date' },
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
      row.unit?.symbol ?? row.unit?.name ?? (row.unit_id == null ? null : `Unit #${row.unit_id}`),
  },
  { key: 'quantity', label: 'Quantity', field: 'quantity', align: 'right' },
  { key: 'base_quantity', label: 'Base quantity', field: 'base_quantity', align: 'right' },
  { key: 'balance_quantity', label: 'Balance quantity', field: 'balance_quantity', align: 'right' },
  { key: 'unit_cost', label: 'Unit cost', field: 'unit_cost', align: 'right' },
  { key: 'total_cost', label: 'Total cost', field: 'total_cost', align: 'right' },
  {
    key: 'reference',
    label: 'Reference',
    format: (row) => `${row.reference_type} #${row.reference_id}`,
  },
  { key: 'batch_no', label: 'Batch', field: 'batch_no' },
  { key: 'expiry_date', label: 'Expiry date', field: 'expiry_date' },
  { key: 'remark', label: 'Remark', field: 'remark' },
  {
    key: 'creator',
    label: 'Created by',
    format: (row) =>
      row.creator?.name ?? (row.created_by == null ? null : `User #${row.created_by}`),
  },
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
} = useDataTable(inventoryLedgerService.list)
</script>
<template>
  <section>
    <h1>Inventory Ledger</h1>
    <p>View inventory movements across warehouses.</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(row: InventoryLedger) => row.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      caption="Inventory Ledger"
      search-placeholder="Search inventory ledger…"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    />
  </section>
</template>
