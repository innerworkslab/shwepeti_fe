<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { object, number, string, ValidationError } from 'yup'
import DataTable from '@/components/common/DataTable.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { useDataTable } from '@/composables/useDataTable'
import { cashbookClosings, type CashbookClosing } from '@/services/cashbook-closing.service'
import { cashbookService } from '@/services/cashbook.service'
import { posCashbookService } from '@/services/pos-cashbook.service'
import { toApiError } from '@/services/api/api-error'
import type { DataTableColumn } from '@/types/data-table'
const props = defineProps<{ pos?: boolean }>()
const service = cashbookClosings(!!props.pos)
const books = ref<{ id: number; name: string; code: string }[]>([])
const optionsLoading = ref(false)
const optionsError = ref('')
const controller = new AbortController()
const columns: DataTableColumn<CashbookClosing>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  { key: 'closing_date', label: 'Closing date', field: 'closing_date' },
  { key: 'closed_at', label: 'Closed at', field: 'closed_at' },
  { key: 'opening_balance', label: 'Opening balance', field: 'opening_balance', align: 'right' },
  { key: 'closing_balance', label: 'Closing balance', field: 'closing_balance', align: 'right' },
  { key: 'remark', label: 'Remark', field: 'remark' },
  { key: 'created_by', label: 'Created by (ID)', field: 'created_by' },
]
const {
  rows,
  total,
  page,
  perPage,
  loading,
  error,
  filters,
  setPage,
  setPerPage,
  setFilters,
  refresh,
} = useDataTable<CashbookClosing, { cashbook_id?: number }>(
  async (params, signal) => {
    if (!params.cashbook_id) return { data: [], total: 0, page: 1, perPage: params.perPage }
    return service.list(params.cashbook_id, { page: params.page, perPage: params.perPage }, signal)
  },
  { immediate: false },
)
const selected = computed(() => books.value.find((b) => b.id === filters.value.cashbook_id))
async function loadOptions() {
  if (optionsLoading.value) return
  optionsLoading.value = true
  optionsError.value = ''
  try {
    const result = await (props.pos
      ? posCashbookService.list(controller.signal)
      : cashbookService.listOptions(controller.signal))
    if (controller.signal.aborted) return
    books.value = result
    setFilters({
      cashbook_id: result.some((b) => b.id === filters.value.cashbook_id)
        ? filters.value.cashbook_id
        : result[0]?.id,
    })
  } catch (e) {
    if (!controller.signal.aborted) optionsError.value = toApiError(e).message
  } finally {
    optionsLoading.value = false
  }
}
function selectBook(event: Event) {
  setFilters({ cashbook_id: Number((event.target as HTMLSelectElement).value) })
}
const dialog = ref<HTMLDialogElement | null>(null)
const saving = ref(false)
const remark = ref('Daily Closing')
const closingId = ref<number>()
const closingName = ref('')
const formError = ref('')
const notice = ref('')
const schema = object({
  cashbook_id: number().integer().positive().required(),
  remark: string().trim().defined(),
})
function openClosing() {
  if (!selected.value || saving.value) return
  closingId.value = selected.value.id
  closingName.value = selected.value.name
  remark.value = 'Daily Closing'
  formError.value = ''
  notice.value = ''
  dialog.value?.showModal()
}
function dismiss() {
  if (!saving.value) dialog.value?.close()
}
async function submit() {
  if (saving.value) return
  saving.value = true
  formError.value = ''
  try {
    const payload = await schema.validate(
      { cashbook_id: closingId.value, remark: remark.value },
      { abortEarly: false, stripUnknown: true },
    )
    await service.close(payload)
    if (!controller.signal.aborted) {
      dialog.value?.close()
      notice.value = 'Cashbook closing saved.'
      void refresh()
    }
  } catch (e) {
    if (!controller.signal.aborted)
      formError.value = e instanceof ValidationError ? e.errors.join(' ') : toApiError(e).message
  } finally {
    saving.value = false
  }
}
onMounted(loadOptions)
onBeforeUnmount(() => {
  controller.abort()
  dialog.value?.close()
})
</script>
<template>
  <main class="closings-page">
    <h1>Cashbook Closings</h1>
    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="optionsLoading" role="status">Loading cashbooks…</p>
    <p v-if="optionsError" role="alert">
      {{ optionsError }} <button @click="loadOptions">Retry cashbooks</button>
    </p>
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
      caption="Cashbook closings"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @refresh="refresh"
    >
      <template #toolbar
        ><button
          class="primary"
          :disabled="!selected || optionsLoading || !!optionsError || saving"
          @click="openClosing"
        >
          <AppIcon name="add" :size="16" />Close cashbook
        </button></template
      >
      <template #filters
        ><label
          >Cashbook<select
            name="cashbook_id"
            :value="filters.cashbook_id ?? ''"
            :disabled="optionsLoading || saving"
            @change="selectBook"
          >
            <option v-if="!books.length" value="" disabled>No cashbooks available</option>
            <option v-for="book in books" :key="book.id" :value="book.id">
              {{ book.name }} ({{ book.code }})
            </option>
          </select></label
        ></template
      >
    </DataTable>
    <dialog ref="dialog" aria-labelledby="closing-title" @cancel.prevent="dismiss">
      <header>
        <h2 id="closing-title">Close cashbook</h2>
        <button aria-label="Close modal" :disabled="saving" @click="dismiss">
          <AppIcon name="close" />
        </button>
      </header>
      <p>
        Cashbook: <strong>{{ closingName }}</strong>
      </p>
      <p v-if="formError" role="alert">{{ formError }}</p>
      <form @submit.prevent="submit">
        <label>Remark<textarea v-model="remark" name="remark" :disabled="saving" /></label>
        <footer>
          <button type="button" :disabled="saving" @click="dismiss">Cancel</button
          ><button type="submit" class="primary" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save closing' }}
          </button>
        </footer>
      </form>
    </dialog>
  </main>
</template>
<style scoped>
.closings-page {
  padding: 24px;
  color: #263b51;
}
label {
  display: grid;
  gap: 8px;
}
select,
textarea {
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  font: inherit;
}
textarea {
  min-height: 90px;
  resize: vertical;
}
button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: white;
  color: #263b51;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
.primary {
  background: #183249;
  color: white;
}
dialog {
  width: min(480px, 90vw);
  border: 0;
  border-radius: 12px;
  padding: 24px;
}
dialog::backdrop {
  background: #172d4766;
}
header,
footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
footer {
  margin-top: 20px;
  justify-content: flex-end;
}
[role='alert'] {
  color: #b91c1c;
}
</style>
