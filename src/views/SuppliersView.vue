<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { useRoute } from 'vue-router'
const route = useRoute()
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { supplierService } from '@/services/supplier.service'
import type { DataTableColumn } from '@/types/data-table'
import type { Supplier } from '@/types/supplier'

const columns: DataTableColumn<Supplier>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  { key: 'name', label: 'Name', field: 'name' },
  { key: 'supplier_code', label: 'Code', field: 'supplier_code' },
  { key: 'supplier_type', label: 'Type', field: 'supplier_type' },
  { key: 'phone_number', label: 'Phone', field: 'phone_number' },
  { key: 'email', label: 'Email', field: 'email' },
  { key: 'credit_limit_amount', label: 'Credit limit', field: 'credit_limit_amount' },
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
} = useDataTable(supplierService.list)
</script>

<template>
  <section>
    <h1>Suppliers</h1>
    <p>Manage suppliers, types, and active status.</p>
    <p
      v-if="route.query.saved === 'created' || route.query.saved === 'updated'"
      role="status"
      class="notice"
    >
      Supplier {{ route.query.saved }}.
    </p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(category: Supplier) => category.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      caption="Suppliers"
      search-placeholder="Search suppliers…"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #toolbar
        ><RouterLink class="primary action" to="/suppliers/create"
          ><AppIcon name="add" :size="16" />Add supplier</RouterLink
        ></template
      >
      <template #cell-status="{ row }">
        <span class="status" :class="{ active: row.is_active === true }">{{
          row.is_active === undefined ? '—' : row.is_active ? 'Active' : 'Inactive'
        }}</span>
      </template>
      <template #cell-actions="{ row }"
        ><RouterLink
          class="action"
          :to="`/suppliers/${row.id}/edit`"
          :aria-label="`Edit ${row.name}`"
          :title="`Edit ${row.name}`"
          ><AppIcon name="pencil" :size="18" /> <span class="action-label">Edit</span></RouterLink
        ><RouterLink
          class="action"
          :to="`/suppliers/${row.id}/ap-ledgers`"
          :aria-label="`View AP ledger for ${row.name}`"
          :title="`View AP ledger for ${row.name}`"
          ><AppIcon name="ledger" :size="18" />
          <span class="action-label">AP ledger</span></RouterLink
        ></template
      >
    </DataTable>
  </section>
</template>

<style scoped>
.action {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  text-decoration: none;
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: inherit;
  background: white;
  cursor: pointer;
}
.action:focus-visible {
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
</style>
