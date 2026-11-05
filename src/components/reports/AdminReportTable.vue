<script setup lang="ts">
import { t } from '@/i18n'
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import {
  adminReportService,
  type ReportRow,
  type ReportMeta,
} from '@/services/admin-report.service'
import { reportDefinitions, reportLabel, type AdminReport } from '@/constants/admin-reports'
import type { DataTableColumn } from '@/types/data-table'
const props = defineProps<{ report: AdminReport }>()
const definition = reportDefinitions[props.report]
const today = new Date()
function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const defaults = {
  date_from: dateKey(
    props.report === 'daily-summary' ? today : new Date(today.getFullYear(), today.getMonth(), 1),
  ),
  date_to: dateKey(today),
}
const dates = reactive({ ...defaults })
const dateError = ref('')
const exporting = ref(false)
const exportError = ref('')
let exportController: AbortController | undefined
onBeforeUnmount(() => exportController?.abort())
async function exportExcel() {
  if (exporting.value || !validateDates()) return
  if (
    props.report !== 'daily-summary' &&
    props.report !== 'room-occupancy' &&
    props.report !== 'room-revenue' &&
    props.report !== 'guest-balances' &&
    props.report !== 'food-sales' &&
    props.report !== 'top-selling-items' &&
    props.report !== 'other-bills' &&
    props.report !== 'inventory-balance' &&
    props.report !== 'low-stock' &&
    props.report !== 'depreciation'
  )
    return
  exporting.value = true
  exportError.value = ''
  exportController = new AbortController()
  const signal = exportController.signal
  try {
    const { blob, filename } = await adminReportService.exportExcel(
      props.report,
      { ...dates },
      signal,
    )
    if (signal.aborted) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    if (!signal.aborted) exportError.value = 'Could not export report. Please try again.'
  } finally {
    exporting.value = false
  }
}
const metadata = ref<ReportMeta>({})
const textFields = new Set(
  'name,date,room,category,guest,charge_type,description,check_in,check_out,status,payment_status,stay_type,order_no,menu_item,item,unit,asset,month'.split(
    ',',
  ),
)
const columns: DataTableColumn<ReportRow>[] = definition.fields.split(',').map((field) => ({
  key: field,
  field,
  label: reportLabel(field),
  align: textFields.has(field) ? 'left' : 'right',
}))
const { rows, total, page, perPage, loading, error, setPage, setPerPage, setFilters, refresh } =
  useDataTable<ReportRow, { date_from: string; date_to: string }>(
    async ({ search: _search, ...params }, signal) => {
      metadata.value = {}
      const result = await adminReportService.list(props.report, params, signal)
      if (!signal?.aborted) metadata.value = result.reportMeta
      return {
        ...result,
        data: result.data.map((row, index) => ({ ...row, _row_key: `${params.page}-${index}` })),
      }
    },
    { initialFilters: defaults, initialPerPage: props.report === 'daily-summary' ? 50 : 15 },
  )
function validateDates() {
  dateError.value = ''
  if (!dates.date_from || !dates.date_to) {
    dateError.value = 'Choose both dates.'
    return false
  }
  if (dates.date_from > dates.date_to) {
    dateError.value = 'From date must be on or before to date.'
    return false
  }
  return true
}
function applyDates() {
  if (validateDates()) setFilters({ ...dates })
}
function resetDates() {
  Object.assign(dates, defaults)
  applyDates()
}
const summaries = computed(() =>
  Object.entries(metadata.value.summary ?? {}).filter(
    (entry): entry is [string, string | number] =>
      typeof entry[1] === 'string' || typeof entry[1] === 'number',
  ),
)
const categorySales = computed(() => {
  const value = metadata.value.summary?.category_sales
  return Array.isArray(value) ? value : []
})
</script>
<template>
  <section class="report-page">
    <header>
      <h1>{{ t(definition.title) }}</h1>
      <p v-if="!loading && !error && metadata.currency">
        {{ t('Currency:') }} {{ metadata.currency
        }}<span v-if="metadata.date_from">
          · {{ metadata.date_from }} – {{ metadata.date_to }}</span
        >
      </p>
    </header>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(row) => String(row._row_key)"
      :total="total"
      :page="page"
      :per-page="perPage"
      :loading="loading"
      :error="error"
      :searchable="false"
      :caption="t(definition.title)"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @refresh="refresh"
    >
      <template
        v-if="
          report === 'daily-summary' ||
          report === 'room-occupancy' ||
          report === 'room-revenue' ||
          report === 'guest-balances' ||
          report === 'food-sales' ||
          report === 'top-selling-items' ||
          report === 'other-bills' ||
          report === 'inventory-balance' ||
          report === 'low-stock' ||
          report === 'depreciation'
        "
        #toolbar
      >
        <button
          class="export-button"
          type="button"
          :disabled="exporting"
          :aria-busy="exporting"
          @click="exportExcel"
        >
          <AppIcon name="download" :size="18" />
          {{ exporting ? t('Exporting Excel…') : t('Export Excel') }}
        </button>
        <p v-if="exportError" role="alert">{{ t(exportError) }}</p>
      </template>
      <template v-if="report === 'profit-and-loss'" #cell-name="{ row }">{{
        t(row.name)
      }}</template>
      <template #filters
        ><form class="report-filters" @submit.prevent="applyDates">
          <label>
            {{ t('From date') }}
            <input v-model="dates.date_from" name="date_from" type="date" required /></label
          ><label>
            {{ t('To date') }}
            <input v-model="dates.date_to" name="date_to" type="date" required /></label
          ><button type="submit">{{ t('Apply dates') }}</button
          ><button type="button" @click="resetDates">{{ t('Reset dates') }}</button>
          <p v-if="dateError" role="alert">{{ t(dateError) }}</p>
        </form></template
      >
    </DataTable>
    <template v-if="!loading && !error">
      <section
        v-if="props.report === 'profit-and-loss'"
        class="report-notes"
        :aria-label="t('Financial report information')"
      >
        <p v-if="metadata.basis">{{ t('Basis:') }} {{ t(reportLabel(metadata.basis)) }}</p>
        <p v-if="metadata.has_missing_costs" role="status" class="warning">
          {{ metadata.missing_cost_count ?? 0 }}
          {{ t('costs are missing. Reported profit excludes these unrecorded costs.') }}
        </p>
        <dl class="summary">
          <div v-if="metadata.recorded_total_expense != null">
            <dt>{{ t('Recorded total expense') }}</dt>
            <dd>{{ metadata.recorded_total_expense }}</dd>
          </div>
          <div v-if="metadata.profit_before_unrecorded_costs != null">
            <dt>{{ t('Profit before unrecorded costs') }}</dt>
            <dd>{{ metadata.profit_before_unrecorded_costs }}</dd>
          </div>
        </dl>
      </section>
      <dl v-if="summaries.length" class="summary" :aria-label="t('Report totals')">
        <div v-for="[key, value] in summaries" :key="key">
          <dt>{{ t(reportLabel(key)) }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>
      <section v-if="categorySales.length" class="category-summary">
        <h2>{{ t('Sales by category') }}</h2>
        <dl class="summary">
          <div v-for="category in categorySales" :key="category.category_id">
            <dt>{{ category.category }}</dt>
            <dd>{{ category.sales }}</dd>
          </div>
        </dl>
      </section>
    </template>
  </section>
</template>
<style scoped>
.report-page {
  color: #263b51;
}
header p {
  color: #64748b;
}
.report-filters {
  display: flex;
  align-items: end;
  gap: 12px;
  flex-wrap: wrap;
}
label {
  display: grid;
  gap: 6px;
  font-size: 14px;
}
input,
button {
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: white;
  font: inherit;
  color: inherit;
}
button {
  cursor: pointer;
}
.export-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #16704a;
  color: white;
  border-color: #16704a;
}
.export-button:disabled {
  opacity: 0.65;
  cursor: wait;
}
button[type='submit'] {
  background: #183249;
  color: white;
}
.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
}
.summary > div {
  padding: 18px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}
dt {
  color: #64748b;
}
dd {
  margin: 8px 0 0;
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
[role='alert'] {
  color: #b91c1c;
}
.warning {
  padding: 14px;
  background: #fff7ed;
  color: #9a3412;
  border-radius: 8px;
}
</style>
