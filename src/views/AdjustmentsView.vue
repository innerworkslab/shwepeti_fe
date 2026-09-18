<script setup lang="ts">
import { reactive, ref, useId } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import TransferFormModal from '@/components/inventory-transfers/TransferFormModal.vue'
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { adjustmentService } from '@/services/adjustment.service'
import type { Adjustment, AdjustmentFilters } from '@/types/adjustment'
import type { DataTableColumn } from '@/types/data-table'

const columns: DataTableColumn<Adjustment>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  { key: 'transaction_date', label: 'Transaction date', field: 'transaction_date' },
  { key: 'remark', label: 'Remark', field: 'remark' },
  { key: 'status', label: 'Status', field: 'status' },
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
  setFilters,
  refresh,
} = useDataTable<Adjustment, AdjustmentFilters>(adjustmentService.list)
const modalOpen = ref(false)
const selected = ref<Adjustment | null>(null)
const notice = ref('')
function openForm(adjustment: Adjustment | null = null) {
  selected.value = adjustment
  notice.value = ''
  modalOpen.value = true
}
function saved() {
  notice.value = selected.value ? 'Adjustment status updated.' : 'Adjustment created.'
  modalOpen.value = false
  void refresh()
}
const prefix = useId()
const dates = reactive({ date_from: '', date_to: '' })
const dateError = ref('')
function applyDates() {
  dateError.value = ''
  if (dates.date_from && dates.date_to && dates.date_from > dates.date_to) {
    dateError.value = 'From date must be on or before the to date.'
    return
  }
  setFilters({ date_from: dates.date_from || undefined, date_to: dates.date_to || undefined })
}
function clearDates() {
  dates.date_from = ''
  dates.date_to = ''
  dateError.value = ''
  setFilters({ date_from: undefined, date_to: undefined })
}
</script>
<template>
  <section>
    <h1>Adjustments</h1>
    <p>View inventory adjustments by transaction date.</p>
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(row: Adjustment) => row.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      caption="Adjustments"
      search-placeholder="Search adjustments…"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #toolbar
        ><button type="button" class="primary" @click="openForm()">Add adjustment</button></template
      >
      <template #cell-actions="{ row }"
        ><button
          type="button"
          :aria-label="`Update status for adjustment #${row.id}`"
          title="Update status"
          @click="openForm(row)"
        >
          <AppIcon name="pencil" :size="18" /></button
      ></template>
      <template #filters>
        <form class="date-filters" @submit.prevent="applyDates">
          <label :for="`${prefix}-from`"
            >From date<input
              :id="`${prefix}-from`"
              name="date_from"
              v-model="dates.date_from"
              type="date"
              :aria-invalid="!!dateError"
              :aria-describedby="dateError ? `${prefix}-date-error` : undefined"
          /></label>
          <label :for="`${prefix}-to`"
            >To date<input
              :id="`${prefix}-to`"
              name="date_to"
              v-model="dates.date_to"
              type="date"
              :aria-invalid="!!dateError"
              :aria-describedby="dateError ? `${prefix}-date-error` : undefined"
          /></label>
          <button type="submit">Apply dates</button
          ><button type="button" @click="clearDates">Clear dates</button>
          <p v-if="dateError" :id="`${prefix}-date-error`" class="error" role="alert">
            {{ dateError }}
          </p>
        </form>
      </template>
    </DataTable>
    <TransferFormModal
      v-if="modalOpen"
      :transfer="selected"
      resource-label="adjustment"
      @close="modalOpen = false"
      @saved="saved"
    />
  </section>
</template>
<style scoped>
.date-filters {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
}
label {
  display: grid;
  gap: 0.375rem;
}
input,
button {
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: inherit;
  background: white;
}
button {
  cursor: pointer;
}
:is(input, button):focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.error {
  flex-basis: 100%;
  color: #b91c1c;
  margin: 0;
  font-size: 0.875rem;
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
</style>
