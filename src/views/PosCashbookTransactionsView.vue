<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import CashbookTransactionModal from '@/components/cashbook-transactions/CashbookTransactionModal.vue'
import { usePermissions } from '@/composables/usePermissions'
import { t } from '@/i18n'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
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
  useDataTable<CashbookTransaction, { cashbook_id: number }>(
    async (params, signal) => {
      balances.value = {}
      if (!Number.isSafeInteger(params.cashbook_id) || params.cashbook_id <= 0)
        throw new Error('Choose a cashbook from the sidebar.')
      const result = await posCashbookService.transactions(
        { page: params.page, perPage: params.perPage, cashbook_id: params.cashbook_id },
        signal,
      )
      if (!signal?.aborted) balances.value = result
      return result
    },
    { initialFilters: { cashbook_id: cashbookId.value } },
  )
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
      <template #toolbar>
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
