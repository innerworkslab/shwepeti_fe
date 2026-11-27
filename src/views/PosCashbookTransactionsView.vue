<script setup lang="ts">
import CashbookExportButton from '@/components/cashbook-transactions/CashbookExportButton.vue'
import CloseCashbookButton from '@/components/cashbook-transactions/CloseCashbookButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import CashbookTransactionModal from '@/components/cashbook-transactions/CashbookTransactionModal.vue'
import { usePermissions } from '@/composables/usePermissions'
import { t } from '@/i18n'
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { posCashbookService } from '@/services/pos-cashbook.service'
import type { CashbookTransaction } from '@/types/cashbook-transaction'
import type { DataTableColumn } from '@/types/data-table'
const { can } = usePermissions()
const showCreate = ref(false)
function saved() {
  showCreate.value = false
  void refresh()
}
const route = useRoute()
const cashbookId = computed(() => Number(route.query.cashbook_id))
const balances = ref<{
  opening_balance?: string | number | null
  closing_balance?: string | number | null
}>({})
const columns: DataTableColumn<CashbookTransaction>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  { key: 'transaction_date', label: 'Date', field: 'transaction_date' },
  { key: 'reference_no', label: 'Reference', field: 'reference_no' },
  { key: 'cashbook', label: 'Cashbook', format: (row) => row.cashbook?.name },
  { key: 'transaction_type', label: 'Type', field: 'transaction_type' },
  { key: 'amount', label: 'Amount', field: 'amount', align: 'right' },
  { key: 'balance_after', label: 'Balance after', field: 'balance_after', align: 'right' },
  { key: 'remark', label: 'Remark', field: 'remark' },
  { key: 'reference_type', label: 'Reference type', field: 'reference_type' },
  { key: 'reference_id', label: 'Reference ID', field: 'reference_id' },
  { key: 'creator', label: 'Created by', format: (row) => row.creator?.name },
  { key: 'created_at', label: 'Created at', field: 'created_at' },
  { key: 'updated_at', label: 'Updated at', field: 'updated_at' },
]
const { rows, total, page, perPage, loading, error, setPage, setPerPage, setFilters, refresh } =
  useDataTable<CashbookTransaction, { cashbook_id: number; date_from?: string; date_to?: string }>(
    async (params, signal) => {
      balances.value = {}
      if (!Number.isSafeInteger(params.cashbook_id) || params.cashbook_id <= 0)
        throw new Error('Choose a cashbook from the sidebar.')
      const result = await posCashbookService.transactions(
        {
          page: params.page,
          perPage: params.perPage,
          cashbook_id: params.cashbook_id,
          ...(params.date_from ? { date_from: params.date_from } : {}),
          ...(params.date_to ? { date_to: params.date_to } : {}),
        },
        signal,
      )
      if (!signal?.aborted) balances.value = result
      return result
    },
    { initialFilters: { cashbook_id: cashbookId.value } },
  )
const dates = reactive({ date_from: '', date_to: '' })
const dateError = ref('')
function applyDates() {
  dateError.value = ''
  if (dates.date_from && dates.date_to && dates.date_from > dates.date_to) {
    dateError.value = 'From date must be on or before to date.'
    return
  }
  setFilters({ date_from: dates.date_from || undefined, date_to: dates.date_to || undefined })
}
function clearDates() {
  dates.date_from = ''
  dates.date_to = ''
  applyDates()
}
watch(cashbookId, (id) => setFilters({ cashbook_id: id }))
</script>
<template>
  <main class="ledger-page">
    <h1>{{ t('Cashbook transactions') }}</h1>
    <p>{{ rows[0]?.cashbook?.name ?? t('Cashbook #{0}', [cashbookId]) }}</p>
    <dl :aria-label="t('Opening balance')">
      <dt>{{ t('Opening balance') }}</dt>
      <dd>{{ t(loading || error ? '—' : (balances.opening_balance ?? '—')) }}</dd>
    </dl>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(row) => row.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :loading="loading"
      :error="error"
      :searchable="false"
      :caption="t('Cashbook transactions')"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @refresh="refresh"
    >
      <template #filters>
        <form class="date-filters" @submit.prevent="applyDates">
          <label
            >{{ t('From date') }}<input v-model="dates.date_from" name="date_from" type="date"
          /></label>
          <label
            >{{ t('To date') }}<input v-model="dates.date_to" name="date_to" type="date"
          /></label>
          <button type="submit">{{ t('Apply dates') }}</button
          ><button type="button" @click="clearDates">{{ t('Clear dates') }}</button>
          <p v-if="dateError" role="alert">{{ t(dateError) }}</p>
        </form>
      </template>
      <template #toolbar
        ><CashbookExportButton
          v-if="can('cashbook_transactions.view')"
          :pos="true"
          kind="transactions"
          :cashbook-id="cashbookId"
          :date-from="dates.date_from"
          :date-to="dates.date_to"
        />
        <CloseCashbookButton
          v-if="can('cashbooks.close') && Number.isSafeInteger(cashbookId) && cashbookId > 0"
          :pos="true"
          :cashbook-id="cashbookId"
          @saved="refresh"
        />
        <RouterLink
          v-if="can('cashbooks.view') && Number.isSafeInteger(cashbookId) && cashbookId > 0"
          class="history-link"
          :to="{ path: '/pos/cashbook-closings', query: { cashbook_id: cashbookId } }"
          ><AppIcon name="ledger" :size="18" />{{ t('Opening / closing history') }}</RouterLink
        >
        <button
          v-if="can('cashbook_transactions.create')"
          class="create-button"
          type="button"
          @click="showCreate = true"
        >
          <AppIcon name="add" :size="18" /> {{ t('Add transaction') }}
        </button>
      </template>
    </DataTable>
    <CashbookTransactionModal
      v-if="showCreate && can('cashbook_transactions.create')"
      :pos="true"
      :cashbook-id="cashbookId"
      @close="showCreate = false"
      @saved="saved"
    />
    <dl :aria-label="t('Closing balance')">
      <dt>{{ t('Closing balance') }}</dt>
      <dd>{{ t(loading || error ? '—' : (balances.closing_balance ?? '—')) }}</dd>
    </dl>
  </main>
</template>
<style scoped>
.date-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: end;
}
.date-filters label {
  display: grid;
  gap: 6px;
}
.date-filters input,
.date-filters button {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  font: inherit;
  background: white;
}
[role='alert'] {
  color: #b91c1c;
}
.history-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #263b51;
  background: white;
  text-decoration: none;
}
.create-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 0;
  border-radius: 8px;
  background: #183249;
  color: white;
  cursor: pointer;
  font: inherit;
}
.ledger-page {
  padding: 24px;
  background: #f4f7fa;
  min-height: calc(100dvh - 60px);
  color: #263b51;
}
dl {
  padding: 18px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}
dt {
  color: #64748b;
  font-size: 14px;
}
dd {
  margin: 8px 0 0;
  font-size: 24px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
