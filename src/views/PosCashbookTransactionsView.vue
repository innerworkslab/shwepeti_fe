<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { posCashbookService } from '@/services/pos-cashbook.service'
import type { CashbookTransaction } from '@/types/cashbook-transaction'
import type { DataTableColumn } from '@/types/data-table'
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
    <h1>Cashbook transactions</h1>
    <p>{{ rows[0]?.cashbook?.name ?? `Cashbook #${cashbookId}` }}</p>
    <dl aria-label="Opening balance">
      <dt>Opening balance</dt>
      <dd>{{ loading || error ? '—' : (balances.opening_balance ?? '—') }}</dd>
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
      caption="Cashbook transactions"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @refresh="refresh"
    />
    <dl aria-label="Closing balance">
      <dt>Closing balance</dt>
      <dd>{{ loading || error ? '—' : (balances.closing_balance ?? '—') }}</dd>
    </dl>
  </main>
</template>
<style scoped>
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
