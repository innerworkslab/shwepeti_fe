<script setup lang="ts">
import { computed, reactive, ref, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { object, array, number, string, lazy } from 'yup'
import { t } from '@/i18n'
import DataTable from '@/components/common/DataTable.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { useDataTable } from '@/composables/useDataTable'
import {
  openingBalanceService as service,
  type OpeningKind,
  type OpeningBalance,
  type OpeningLine,
} from '@/services/opening-balance.service'
import { cashbookService } from '@/services/cashbook.service'
import { itemService } from '@/services/item.service'
import { warehouseService } from '@/services/warehouse.service'
import { currentDateTime } from '@/utils/current-date-time'
import { toApiError } from '@/services/api/api-error'
import type { DataTableColumn } from '@/types/data-table'
const props = defineProps<{ kind: OpeningKind }>()
const route = useRoute(),
  router = useRouter()
const creating = computed(() => route.path.endsWith('/create'))
const title = computed(() =>
  props.kind === 'cashbooks' ? 'Cashbook opening balances' : 'Item opening balances',
)
const basePath = computed(() => `/opening-balances/${props.kind}`)
const dates = reactive({ date_from: '', date_to: '' })
const filterError = ref('')
const { rows, total, page, perPage, loading, error, refresh, setPage, setPerPage, setFilters } =
  useDataTable<OpeningBalance, { date_from?: string; date_to?: string }>(
    (params, signal) => service.list(props.kind, params, signal),
    { immediate: !creating.value },
  )
const linesFor = (row: OpeningBalance) => row[props.kind] ?? []
const money = (value: unknown) =>
  Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
const lineTotal = (line: OpeningLine) =>
  props.kind === 'cashbooks'
    ? Number(line.amount ?? 0)
    : Number(line.total_value ?? Number(line.qty ?? 0) * Number(line.unit_cost ?? 0))
const columns: DataTableColumn<OpeningBalance>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  { key: 'reference_no', label: 'Reference', field: 'reference_no' },
  { key: 'date', label: 'Date', field: 'date' },
  { key: 'lines', label: 'Lines' },
  {
    key: 'total',
    label: 'Total amount',
    format: (row) => money(linesFor(row).reduce((sum, line) => sum + lineTotal(line), 0)),
    align: 'right',
  },
  { key: 'status', label: 'Status', field: 'status' },
  { key: 'created_by', label: 'Created by (ID)', field: 'created_by' },
  { key: 'confirmed_at', label: 'Confirmed at', field: 'confirmed_at' },
  { key: 'cancelled_at', label: 'Cancelled at', field: 'cancelled_at' },
  { key: 'actions', label: 'Actions' },
]
function clearDates() {
  dates.date_from = ''
  dates.date_to = ''
  applyDates()
}
function applyDates() {
  filterError.value = ''
  if (dates.date_from && dates.date_to && dates.date_from > dates.date_to) {
    filterError.value = 'From date must be on or before to date.'
    return
  }
  setFilters({ date_from: dates.date_from || undefined, date_to: dates.date_to || undefined })
}
const options = ref<{ id: number; name: string }[]>([]),
  warehouses = ref<{ id: number; name: string }[]>([])
const optionsLoading = ref(false),
  optionsError = ref(''),
  formError = ref(''),
  busy = ref(false)
const controller = new AbortController()
let lookupVersion = 0
async function loadOptions() {
  const version = ++lookupVersion
  optionsLoading.value = true
  optionsError.value = ''
  options.value = []
  warehouses.value = []
  try {
    const [records, stores] = await Promise.all([
      props.kind === 'cashbooks'
        ? cashbookService.listOptions(controller.signal)
        : itemService.listOptions(controller.signal),
      props.kind === 'items'
        ? warehouseService.listOptions(controller.signal)
        : Promise.resolve([]),
    ])
    if (version !== lookupVersion || controller.signal.aborted) return
    options.value = records
    warehouses.value = stores
  } catch (cause) {
    if (!controller.signal.aborted && version === lookupVersion)
      optionsError.value = toApiError(cause).message
  } finally {
    if (version === lookupVersion) optionsLoading.value = false
  }
}
const form = reactive({ date: currentDateTime().slice(0, 10), lines: [newLine()] })
function newLine() {
  return { cashbook_id: '', item_id: '', warehouse_id: '', amount: '', qty: '', unit_cost: '' }
}
watch(
  () => [props.kind, creating.value],
  () => {
    form.date = currentDateTime().slice(0, 10)
    form.lines = [newLine()]
    formError.value = ''
    selected.value = null
    if (creating.value) void loadOptions()
    else {
      dates.date_from = ''
      dates.date_to = ''
      setFilters({ date_from: undefined, date_to: undefined })
    }
  },
)
if (creating.value) void loadOptions()
const positiveId = number().typeError('Choose an option.').integer().positive().required()
async function save() {
  if (busy.value || optionsLoading.value || optionsError.value) return
  formError.value = ''
  busy.value = true
  try {
    const cash = props.kind === 'cashbooks'
    const schema = object({
      date: string()
        .required()
        .matches(/^\d{4}-\d{2}-\d{2}$/),
      lines: array()
        .min(1)
        .required()
        .of(
          lazy(() =>
            cash
              ? object({
                  cashbook_id: positiveId,
                  amount: number().typeError('Enter an amount.').min(0).required(),
                })
              : object({
                  item_id: positiveId,
                  warehouse_id: positiveId,
                  qty: number().typeError('Enter quantity.').positive().required(),
                  unit_cost: number().typeError('Enter unit cost.').min(0).required(),
                }),
          ),
        ),
    })
    await schema.validate(form)
    const keys = new Set<string>()
    const payloadLines = form.lines.map((line) => {
      const id = Number(cash ? line.cashbook_id : line.item_id)
      if (
        !options.value.some((option) => option.id === id) ||
        (!cash && !warehouses.value.some((option) => option.id === Number(line.warehouse_id)))
      )
        throw new Error('Choose an option.')
      const key = cash ? String(id) : `${id}:${line.warehouse_id}`
      if (keys.has(key)) throw new Error('Duplicate opening balance line.')
      keys.add(key)
      return cash
        ? { cashbook_id: id, amount: Number(line.amount) }
        : {
            item_id: id,
            warehouse_id: Number(line.warehouse_id),
            qty: String(line.qty),
            unit_cost: Number(line.unit_cost),
          }
    })
    await service.create(props.kind, { date: form.date, [props.kind]: payloadLines })
    await router.push(basePath.value)
  } catch (cause) {
    formError.value = toApiError(cause).message
  } finally {
    busy.value = false
  }
}
const selected = ref<OpeningBalance | null>(null),
  status = ref<'confirmed' | 'cancelled'>('confirmed'),
  statusError = ref('')
function openStatus(row: OpeningBalance) {
  selected.value = row
  status.value = 'confirmed'
  statusError.value = ''
}
async function updateStatus() {
  if (!selected.value || busy.value || selected.value.status !== 'draft') return
  busy.value = true
  statusError.value = ''
  try {
    await service.status(props.kind, selected.value.id, status.value)
    selected.value = null
    await refresh()
  } catch (cause) {
    statusError.value = toApiError(cause).message
  } finally {
    busy.value = false
  }
}
onBeforeUnmount(() => controller.abort())
</script>
<template>
  <main class="opening-page">
    <header>
      <h1>{{ t(creating ? 'Add opening balance' : title) }}</h1>
      <p>{{ t(title) }}</p>
    </header>
    <form v-if="creating" class="opening-form" @submit.prevent="save">
      <p v-if="optionsLoading">{{ t('Loading…') }}</p>
      <p v-if="optionsError" role="alert">
        {{ t(optionsError) }} <button type="button" @click="loadOptions">{{ t('Retry') }}</button>
      </p>
      <fieldset :disabled="busy || optionsLoading || !!optionsError">
        <label>{{ t('Date') }}<input v-model="form.date" type="date" required /></label>
        <section v-for="(line, index) in form.lines" :key="index" class="line">
          <label v-if="kind === 'cashbooks'"
            >{{ t('Cashbook')
            }}<select v-model="line.cashbook_id" required>
              <option value="" disabled>{{ t('Select cashbook') }}</option>
              <option v-for="option in options" :key="option.id" :value="option.id">
                {{ option.name }}
              </option>
            </select></label
          >
          <template v-else>
            <label
              >{{ t('Item')
              }}<select v-model="line.item_id" required>
                <option value="" disabled>{{ t('Select item') }}</option>
                <option v-for="option in options" :key="option.id" :value="option.id">
                  {{ option.name }}
                </option>
              </select></label
            >
            <label
              >{{ t('Warehouse')
              }}<select v-model="line.warehouse_id" required>
                <option value="" disabled>{{ t('Select warehouse') }}</option>
                <option v-for="option in warehouses" :key="option.id" :value="option.id">
                  {{ option.name }}
                </option>
              </select></label
            >
            <label
              >{{ t('Quantity')
              }}<input v-model="line.qty" type="number" min="0.000001" step="any" required
            /></label>
            <label
              >{{ t('Unit cost')
              }}<input v-model="line.unit_cost" type="number" min="0" step="any" required
            /></label>
            <label
              >{{ t('Total amount')
              }}<output>{{ money(Number(line.qty) * Number(line.unit_cost)) }}</output></label
            >
          </template>
          <label v-if="kind === 'cashbooks'"
            >{{ t('Amount')
            }}<input v-model="line.amount" type="number" min="0" step="any" required
          /></label>
          <button
            type="button"
            :disabled="form.lines.length === 1"
            :aria-label="t('Remove line')"
            @click="form.lines.splice(index, 1)"
          >
            <AppIcon name="remove" :size="18" />
          </button>
        </section>
        <button type="button" @click="form.lines.push(newLine())">
          <AppIcon name="add" :size="16" />{{ t('Add line') }}
        </button>
      </fieldset>
      <p v-if="formError" role="alert">{{ t(formError) }}</p>
      <footer>
        <button type="button" :disabled="busy" @click="router.push(basePath)">
          {{ t('Cancel') }}</button
        ><button class="primary" :disabled="busy || optionsLoading || !!optionsError">
          {{ t(busy ? 'Saving…' : 'Save draft') }}
        </button>
      </footer>
    </form>
    <DataTable
      v-else
      :rows="rows"
      :columns="columns"
      :row-key="(row) => row.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :loading="loading"
      :error="error"
      :searchable="false"
      :caption="t(title)"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @refresh="refresh"
    >
      <template #toolbar
        ><button class="primary" @click="router.push(`${basePath}/create`)">
          <AppIcon name="add" :size="16" />{{ t('Add opening balance') }}
        </button></template
      >
      <template v-if="kind === 'items'" #filters
        ><form class="filters" @submit.prevent="applyDates">
          <label>{{ t('From date') }}<input v-model="dates.date_from" type="date" /></label
          ><label>{{ t('To date') }}<input v-model="dates.date_to" type="date" /></label
          ><button>{{ t('Apply dates') }}</button
          ><button
            type="button"
            @click="clearDates"
          >
            {{ t('Clear dates') }}
          </button>
          <p v-if="filterError" role="alert">{{ t(filterError) }}</p>
        </form></template
      >
      <template #cell-lines="{ row }"
        ><details>
          <summary>{{ linesFor(row).length }} {{ t('Lines') }}</summary>
          <ul>
            <li v-for="(line, index) in linesFor(row)" :key="index">
              <template v-if="kind === 'cashbooks'"
                >{{ t('Cashbook') }} #{{ line.cashbook_id }} · {{ money(line.amount) }}</template
              ><template v-else
                >{{ t('Item') }} #{{ line.item_id }} · {{ t('Warehouse') }} #{{
                  line.warehouse_id
                }}
                · {{ t('Quantity') }}: {{ line.qty }} · {{ t('Unit cost') }}:
                {{ money(line.unit_cost) }} · {{ t('Total amount') }}:
                {{ money(lineTotal(line)) }}</template
              >
            </li>
          </ul>
        </details></template
      >
      <template #cell-actions="{ row }"
        ><button
          v-if="row.status === 'draft'"
          :aria-label="t('Update status')"
          :title="t('Update status')"
          @click="openStatus(row)"
        >
          <AppIcon name="pencil" :size="18" /></button
        ><span v-else>—</span></template
      >
    </DataTable>
    <div v-if="selected" class="overlay" @click.self="!busy && (selected = null)">
      <section
        role="dialog"
        aria-modal="true"
        :aria-label="t('Update status')"
        class="status-dialog"
      >
        <h2>{{ t('Update status') }}</h2>
        <p>{{ selected.reference_no }}</p>
        <form @submit.prevent="updateStatus">
          <label
            >{{ t('Status')
            }}<select v-model="status" :disabled="busy">
              <option value="confirmed">{{ t('Confirmed') }}</option>
              <option value="cancelled">{{ t('Cancelled') }}</option>
            </select></label
          >
          <p v-if="statusError" role="alert">{{ t(statusError) }}</p>
          <footer>
            <button type="button" :disabled="busy" @click="selected = null">
              {{ t('Cancel') }}</button
            ><button class="primary" :disabled="busy">{{ t(busy ? 'Saving…' : 'Save') }}</button>
          </footer>
        </form>
      </section>
    </div>
  </main>
</template>
<style scoped>
.opening-page {
  padding: 24px;
  color: #263b51;
}
header {
  margin-bottom: 24px;
}
header p {
  color: #64748b;
}
.opening-form,
.status-dialog {
  background: white;
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}
fieldset {
  border: 0;
  padding: 0;
}
label {
  display: grid;
  gap: 7px;
}
input,
select,
button {
  font: inherit;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: white;
}
button {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
.primary {
  background: #183249;
  color: white;
}
.line {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: end;
  padding: 20px 0;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 16px;
}
.line label {
  flex: 1;
  min-width: 140px;
}
output {
  padding: 10px;
}
footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
}
[role='alert'] {
  color: #b91c1c;
}
summary {
  color: #0284c7;
  cursor: pointer;
}
li {
  padding: 8px;
}
.overlay {
  position: fixed;
  inset: 0;
  background: #172d4766;
  display: grid;
  place-items: center;
  z-index: 100;
}
.status-dialog {
  width: min(480px, 90vw);
}
</style>
