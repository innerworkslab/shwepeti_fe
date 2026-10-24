<script setup lang="ts">
import { createRequestId } from '@/utils/uuid'
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { ValidationError } from 'yup'
import DataTable from '@/components/common/DataTable.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { useDataTable } from '@/composables/useDataTable'
import {
  cashbookTransfers,
  type CashbookTransfer,
  type CashbookTransferFilters,
  type TransferCashbook,
} from '@/services/cashbook-transfer.service'
import { cashbookService } from '@/services/cashbook.service'
import { posCashbookService } from '@/services/pos-cashbook.service'
import { cashbookTransferSchema } from '@/schemas/cashbook-transfer.schema'
import { toApiError } from '@/services/api/api-error'
import type { DataTableColumn } from '@/types/data-table'
const props = defineProps<{ pos?: boolean }>()
const service = cashbookTransfers(!!props.pos)
const columns: DataTableColumn<CashbookTransfer>[] = [
  { key: 'reference_no', label: 'Reference', field: 'reference_no' },
  { key: 'transfer_date', label: 'Transfer date', field: 'transfer_date' },
  {
    key: 'from',
    label: 'From cashbook',
    format: (r) => r.from_cashbook?.name ?? `#${r.from_cashbook_id}`,
  },
  { key: 'to', label: 'To cashbook', format: (r) => r.to_cashbook?.name ?? `#${r.to_cashbook_id}` },
  { key: 'amount', label: 'Amount', field: 'amount', align: 'right' },
  { key: 'remark', label: 'Remark', field: 'remark' },
  { key: 'creator', label: 'Created by', format: (r) => r.creator?.name },
  { key: 'created_at', label: 'Created at', field: 'created_at' },
  { key: 'actions', label: 'Actions', align: 'right' },
]
const { rows, total, page, perPage, loading, error, setPage, setPerPage, setFilters, refresh } =
  useDataTable<CashbookTransfer, CashbookTransferFilters>(
    ({ search: _search, ...params }, signal) => service.list(params, signal),
  )
const filters = reactive({ date_from: '', date_to: '', cashbook_id: '' })
const filterError = ref('')
function applyFilters() {
  filterError.value = ''
  if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
    filterError.value = 'From date must be on or before to date.'
    return
  }
  setFilters({
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    cashbook_id: filters.cashbook_id ? Number(filters.cashbook_id) : undefined,
  })
}
function clearFilters() {
  Object.assign(filters, { date_from: '', date_to: '', cashbook_id: '' })
  applyFilters()
}
const cashbooks = ref<TransferCashbook[]>([])
const optionsError = ref('')
const optionsLoading = ref(false)
const controller = new AbortController()
async function loadOptions() {
  optionsLoading.value = true
  optionsError.value = ''
  try {
    const result = await (props.pos
      ? posCashbookService.list(controller.signal)
      : cashbookService.listOptions(controller.signal))
    if (!controller.signal.aborted) cashbooks.value = result
  } catch (e) {
    if (!controller.signal.aborted) optionsError.value = toApiError(e).message
  } finally {
    optionsLoading.value = false
  }
}
onMounted(loadOptions)
const dialog = ref<HTMLDialogElement | null>(null)
const mode = ref<'create' | 'detail'>('create')
const detail = ref<CashbookTransfer | null>(null)
const detailLoading = ref(false)
let detailController: AbortController | undefined
const selectedId = ref<number>()
const saving = ref(false)
const message = ref('')
const formError = ref('')
const form = reactive({
  request_id: '',
  from_cashbook_id: '',
  to_cashbook_id: '',
  amount: '',
  transfer_date: '',
  remark: '',
})
function openCreate() {
  mode.value = 'create'
  formError.value = ''
  message.value = ''
  Object.assign(form, {
    request_id: createRequestId(),
    from_cashbook_id: '',
    to_cashbook_id: '',
    amount: '',
    transfer_date: '',
    remark: '',
  })
  dialog.value?.showModal()
}
async function loadDetail(id: number) {
  detailController?.abort()
  detailController = new AbortController()
  const active = detailController
  selectedId.value = id
  mode.value = 'detail'
  detail.value = null
  detailLoading.value = true
  formError.value = ''
  if (!dialog.value?.open) dialog.value?.showModal()
  try {
    const result = await service.get(id, active.signal)
    if (!active.signal.aborted) detail.value = result
  } catch (e) {
    if (!active.signal.aborted) formError.value = toApiError(e).message
  } finally {
    if (!active.signal.aborted) detailLoading.value = false
  }
}
function close() {
  if (!saving.value) {
    detailController?.abort()
    dialog.value?.close()
  }
}
async function submit() {
  if (saving.value || optionsLoading.value || optionsError.value) return
  formError.value = ''
  saving.value = true
  try {
    const payload = await cashbookTransferSchema.validate(form, {
      abortEarly: false,
      stripUnknown: true,
    })
    if (
      ![payload.from_cashbook_id, payload.to_cashbook_id].every((id) =>
        cashbooks.value.some((c) => c.id === id),
      )
    )
      throw new Error('Choose cashbooks from the list.')
    saving.value = true
    await service.create(payload)
    if (!controller.signal.aborted) {
      dialog.value?.close()
      message.value = 'Cashbook transfer created.'
      void refresh()
    }
  } catch (e) {
    if (!controller.signal.aborted)
      formError.value = e instanceof ValidationError ? e.errors.join(' ') : toApiError(e).message
  } finally {
    saving.value = false
  }
}
onBeforeUnmount(() => {
  controller.abort()
  detailController?.abort()
  dialog.value?.close()
})
</script>
<template>
  <main class="transfer-page">
    <h1>Cashbook Transfers</h1>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="optionsError" role="alert">
      {{ optionsError }} <button @click="loadOptions">Retry cashbooks</button>
    </p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(r) => r.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :loading="loading"
      :error="error"
      :searchable="false"
      caption="Cashbook transfers"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @refresh="refresh"
    >
      <template #toolbar
        ><button class="primary" @click="openCreate">
          <AppIcon name="add" :size="16" />New transfer
        </button></template
      >
      <template #filters
        ><form class="filters" @submit.prevent="applyFilters">
          <label
            >Cashbook<select
              v-model="filters.cashbook_id"
              name="filter_cashbook_id"
              :disabled="optionsLoading"
            >
              <option value="">All cashbooks</option>
              <option v-for="book in cashbooks" :key="book.id" :value="book.id">
                {{ book.name }}
              </option>
            </select></label
          >
          <label>From date<input v-model="filters.date_from" type="date" name="date_from" /></label
          ><label>To date<input v-model="filters.date_to" type="date" name="date_to" /></label>
          <button type="submit">Apply filters</button
          ><button type="button" @click="clearFilters">Clear filters</button>
          <p v-if="filterError" role="alert">{{ filterError }}</p>
        </form></template
      >
      <template #cell-actions="{ row }"
        ><button
          :aria-label="`View transfer ${row.reference_no}`"
          title="View transfer"
          @click="loadDetail(row.id)"
        >
          <AppIcon name="availability" :size="18" /></button
      ></template>
    </DataTable>
    <dialog ref="dialog" aria-labelledby="transfer-title" @cancel.prevent="close">
      <header>
        <h2 id="transfer-title">
          {{ mode === 'create' ? 'New cashbook transfer' : 'Transfer details' }}
        </h2>
        <button aria-label="Close" :disabled="saving" @click="close">
          <AppIcon name="close" />
        </button>
      </header>
      <p v-if="formError" role="alert">
        {{ formError }}
        <button v-if="mode === 'detail' && selectedId" @click="loadDetail(selectedId)">
          Retry
        </button>
      </p>
      <form v-if="mode === 'create'" @submit.prevent="submit">
        <fieldset :disabled="saving || optionsLoading || !!optionsError">
          <label
            >From cashbook<select v-model="form.from_cashbook_id" name="from_cashbook_id">
              <option value="">Choose cashbook</option>
              <option v-for="book in cashbooks" :key="book.id" :value="book.id">
                {{ book.name }} ({{ book.code }})
              </option>
            </select></label
          >
          <label
            >To cashbook<select v-model="form.to_cashbook_id" name="to_cashbook_id">
              <option value="">Choose cashbook</option>
              <option
                v-for="book in cashbooks"
                :key="book.id"
                :value="book.id"
                :disabled="Number(form.from_cashbook_id) === book.id"
              >
                {{ book.name }} ({{ book.code }})
              </option>
            </select></label
          >
          <label
            >Amount<input v-model="form.amount" name="amount" type="number" min="0.01" step="0.01"
          /></label>
          <label
            >Transfer date<input
              v-model="form.transfer_date"
              name="transfer_date"
              type="datetime-local"
              step="1"
          /></label>
          <label>Remark<textarea v-model="form.remark" name="remark" /></label>
          <button type="submit" class="primary">
            {{ saving ? 'Saving…' : 'Create transfer' }}
          </button>
        </fieldset>
      </form>
      <p v-else-if="detailLoading" role="status">Loading transfer…</p>
      <template v-else-if="detail">
        <dl>
          <dt>Reference</dt>
          <dd>{{ detail.reference_no }}</dd>
          <dt>Request ID</dt>
          <dd>{{ detail.request_id }}</dd>
          <dt>From</dt>
          <dd>{{ detail.from_cashbook?.name }} ({{ detail.from_cashbook?.code }})</dd>
          <dt>To</dt>
          <dd>{{ detail.to_cashbook?.name }} ({{ detail.to_cashbook?.code }})</dd>
          <dt>Amount</dt>
          <dd>{{ detail.amount }}</dd>
          <dt>Date</dt>
          <dd>{{ detail.transfer_date }}</dd>
          <dt>Remark</dt>
          <dd>{{ detail.remark || '—' }}</dd>
          <dt>Created by</dt>
          <dd>{{ detail.creator?.name }} {{ detail.creator?.email }}</dd>
          <dt>Created at</dt>
          <dd>{{ detail.created_at }}</dd>
        </dl>
        <h3>Ledger entries</h3>
        <div class="entries">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Cashbook</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance after</th>
                <th>Date</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in detail.transactions" :key="entry.id">
                <td>{{ entry.reference_no }}</td>
                <td>
                  {{ cashbooks.find((c) => c.id === entry.cashbook_id)?.name ?? entry.cashbook_id }}
                </td>
                <td>{{ entry.transaction_type }}</td>
                <td>{{ entry.amount }}</td>
                <td>{{ entry.balance_after }}</td>
                <td>{{ entry.transaction_date }}</td>
                <td>{{ entry.remark }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </dialog>
  </main>
</template>
<style scoped>
.transfer-page {
  padding: 24px;
  color: #263b51;
}
.filters {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
}
label {
  display: grid;
  gap: 6px;
}
input,
select,
textarea {
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font: inherit;
}
button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  cursor: pointer;
  background: white;
  color: #263b51;
}
.primary {
  background: #183249;
  color: white;
}
button:disabled {
  opacity: 0.5;
  cursor: wait;
}
dialog {
  width: min(850px, 90vw);
  max-height: 85vh;
  border: 0;
  border-radius: 12px;
  padding: 24px;
}
dialog::backdrop {
  background: #172d4766;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
fieldset {
  border: 0;
  padding: 0;
  display: grid;
  gap: 16px;
}
[role='alert'] {
  color: #b91c1c;
}
dd {
  margin: 4px 0 14px;
  overflow-wrap: anywhere;
}
dt {
  font-weight: 600;
}
.entries {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 10px;
  border-bottom: 1px solid #e2e8f0;
}
</style>
