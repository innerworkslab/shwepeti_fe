<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { posCashbookService, type PosCashbook } from '@/services/pos-cashbook.service'
import type { DataTableColumn } from '@/types/data-table'
const columns: DataTableColumn<PosCashbook>[] = [
  { key: 'code', label: 'Code', field: 'code' },
  { key: 'name', label: 'Name', field: 'name' },
  { key: 'type', label: 'Type', field: 'type' },
  { key: 'opening_balance', label: 'Opening balance', field: 'opening_balance', align: 'right' },
  { key: 'current_balance', label: 'Current balance', field: 'current_balance', align: 'right' },
  { key: 'description', label: 'Description', field: 'description' },
  { key: 'status', label: 'Status', format: (row) => (row.is_active ? 'Active' : 'Inactive') },
  { key: 'created_at', label: 'Created at', field: 'created_at' },
  { key: 'updated_at', label: 'Updated at', field: 'updated_at' },
]
// This endpoint returns all rows with meta: []; search and paginate locally.
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
} = useDataTable<PosCashbook>(async (params, signal) => {
  const all = await posCashbookService.list(signal)
  const filtered = all.filter((row) =>
    `${row.code} ${row.name} ${row.type} ${row.description || ''}`
      .toLowerCase()
      .includes(params.search.trim().toLowerCase()),
  )
  return {
    data: filtered.slice((params.page - 1) * params.perPage, params.page * params.perPage),
    total: filtered.length,
    page: params.page,
    perPage: params.perPage,
  }
})
</script>
<template>
  <main class="cashbooks-page">
    <h1>Cashbooks</h1>
    <p>View cash and bank account balances.</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(row) => row.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      caption="POS cashbooks"
      search-placeholder="Search cashbooks"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    />
  </main>
</template>
<style scoped>
.cashbooks-page {
  padding: 28px;
  background: #f4f7fa;
  color: #263b51;
  min-height: calc(100dvh - 60px);
}
h1 {
  margin: 0;
  font-size: 26px;
}
p {
  color: #64748b;
  margin-bottom: 24px;
}
@media (max-width: 600px) {
  .cashbooks-page {
    padding: 16px;
  }
}
</style>
