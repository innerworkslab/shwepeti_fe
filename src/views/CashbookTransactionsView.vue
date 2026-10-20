<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, watch, reactive, ref, useId } from 'vue'
import CashbookTransactionModal from '@/components/cashbook-transactions/CashbookTransactionModal.vue'
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { cashbookTransactionService } from '@/services/cashbook-transaction.service'
import type { CashbookTransaction, CashbookTransactionFilters } from '@/types/cashbook-transaction'
import type { DataTableColumn } from '@/types/data-table'

const route = useRoute()
const cashbookId = computed(() => {
  const id = Number(route.query.cashbook_id)
  return Number.isSafeInteger(id) && id > 0 ? id : undefined
})
const balances = ref<{
  opening_balance?: string | number | null
  closing_balance?: string | number | null
}>({})
const columns: DataTableColumn<CashbookTransaction>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  { key: 'transaction_date', label: 'Transaction date', field: 'transaction_date' },
  { key: 'remark', label: 'Remark', field: 'remark' },
  {
    key: 'cashbook',
    label: 'Cashbook',
    format: (row) => row.cashbook?.name ?? `#${row.cashbook_id}`,
  },
  { key: 'transaction_type', label: 'Type', field: 'transaction_type' },
  { key: 'amount', label: 'Amount', field: 'amount' },
  { key: 'reference_no', label: 'Reference', field: 'reference_no' },
  { key: 'balance_after', label: 'Balance after', field: 'balance_after' },
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
} = useDataTable<CashbookTransaction, CashbookTransactionFilters>(
  async ({ search: _search, ...params }, signal) => {
    balances.value = {}
    const result = await cashbookTransactionService.list(params, signal)
    if (!signal?.aborted)
      balances.value = {
        opening_balance: result.opening_balance,
        closing_balance: result.closing_balance,
      }
    return result
  },
  { initialFilters: { cashbook_id: cashbookId.value } },
)
watch(cashbookId, (id) => setFilters({ cashbook_id: id }))
const modalOpen = ref(false)
const selected = ref<CashbookTransaction | null>(null)
const notice = ref('')
function openForm(transaction: CashbookTransaction | null = null) {
  selected.value = transaction
  notice.value = ''
  modalOpen.value = true
}
function saved() {
  notice.value = 'Cashbook transaction created.'
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
    <h1>Cashbook Transactions</h1>
    <p>
      {{
        cashbookId
          ? `Transactions for cashbook #${cashbookId}.`
          : 'View cashbook transactions by date.'
      }}
    </p>
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <dl class="ledger-balances" aria-label="Opening balance">
      <div>
        <dt>Opening balance</dt>
        <dd>{{ loading || error ? '—' : (balances.opening_balance ?? '—') }}</dd>
      </div>
    </dl>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(row: CashbookTransaction) => row.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :searchable="false"
      :loading="loading"
      :error="error"
      caption="Cashbook transactions"
      search-placeholder="Search adjustments…"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #toolbar
        ><button type="button" class="primary" @click="openForm()">
          <AppIcon name="add" :size="16" />Add transaction
        </button></template
      >
      <template #cell-actions="{ row }">
        <button
          type="button"
          :aria-label="`View transaction #${row.id}`"
          :title="`View transaction #${row.id}`"
          @click="openForm(row)"
        >
          <AppIcon name="availability" :size="18" /><span class="action-label">View details</span>
        </button>
      </template>
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
    <dl class="ledger-balances" aria-label="Closing balance">
      <div>
        <dt>Closing balance</dt>
        <dd>{{ loading || error ? '—' : (balances.closing_balance ?? '—') }}</dd>
      </div>
    </dl>
    <CashbookTransactionModal
      :transaction-id="selected?.id"
      v-if="modalOpen"
      @close="modalOpen = false"
      @saved="saved"
    />
  </section>
</template>
<style scoped>
.ledger-balances {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 1rem 0;
}
.ledger-balances > div {
  flex: 1;
  min-width: 180px;
  padding: 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}
.ledger-balances dt {
  color: #64748b;
  font-size: 0.875rem;
}
.ledger-balances dd {
  margin: 0.5rem 0 0;
  font-size: 1.4rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

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
