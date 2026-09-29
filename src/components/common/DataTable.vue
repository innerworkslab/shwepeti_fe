<script setup lang="ts" generic="Row extends object">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import type { DataTableColumn } from '@/types/data-table'

const props = withDefaults(
  defineProps<{
    rows: readonly Row[]
    columns: readonly DataTableColumn<Row>[]
    rowKey: (row: Row) => string | number
    total: number
    page: number
    perPage: number
    search?: string
    loading?: boolean
    error?: { message: string } | null
    caption?: string
    searchable?: boolean
    searchPlaceholder?: string
    pageSizes?: readonly number[]
  }>(),
  {
    search: '',
    loading: false,
    error: null,
    caption: 'Records',
    searchable: true,
    searchPlaceholder: 'Search records…',
    pageSizes: () => [10, 20, 50, 100],
  },
)

const emit = defineEmits<{
  'update:search': [value: string]
  'update:page': [value: number]
  'update:perPage': [value: number]
  refresh: []
}>()

defineSlots<{
  filters?: () => unknown
  toolbar?: () => unknown
  loading?: () => unknown
  empty?: () => unknown
  error?: (props: { error: { message: string }; retry: () => void }) => unknown
  [name: `cell-${string}`]: (props: {
    row: Row
    column: DataTableColumn<Row>
    value: unknown
  }) => unknown
  [name: `header-${string}`]: (props: { column: DataTableColumn<Row> }) => unknown
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))
const sizes = computed(() =>
  [...new Set([...props.pageSizes, props.perPage])]
    .filter((size) => Number.isSafeInteger(size) && size > 0)
    .sort((a, b) => a - b),
)
const start = computed(() => (props.rows.length ? (props.page - 1) * props.perPage + 1 : 0))
const end = computed(() =>
  props.rows.length ? Math.min(start.value + props.rows.length - 1, props.total) : 0,
)

function cellValue(row: Row, column: DataTableColumn<Row>) {
  return column.format ? column.format(row) : column.field ? row[column.field] : ''
}

function updateSearch(event: Event) {
  emit('update:search', (event.target as HTMLInputElement).value)
}
function updatePerPage(event: Event) {
  emit('update:perPage', Number((event.target as HTMLSelectElement).value))
}
</script>

<template>
  <section class="data-table" :aria-label="caption">
    <div class="data-table__toolbar">
      <label v-if="searchable" class="data-table__search">
        <span>Search</span>
        <div class="data-table__search-input">
          <AppIcon name="search" :size="18" /><input
            type="search"
            :value="search"
            :placeholder="searchPlaceholder"
            @input="updateSearch"
          />
        </div>
      </label>

      <div class="data-table__actions">
        <slot name="toolbar" />
        <button type="button" :disabled="loading" @click="emit('refresh')">
          <AppIcon name="refresh" :size="16" />Refresh
        </button>
      </div>
    </div>

    <div v-if="$slots.filters" class="data-table__filters">
      <div class="data-table__filter-heading">
        <AppIcon name="filters" :size="16" /><span>Filters</span>
      </div>
      <div class="data-table__filter-controls"><slot name="filters" /></div>
    </div>
    <div v-if="error && !loading" class="data-table__error" role="alert">
      <slot name="error" :error="error" :retry="() => emit('refresh')">
        <span>{{ error.message }}</span>
        <button type="button" @click="emit('refresh')">Try again</button>
      </slot>
    </div>

    <p class="data-table__status" role="status" aria-live="polite">
      {{
        loading ? 'Loading records…' : error ? 'Could not load records.' : `${total} records found.`
      }}
    </p>
    <div
      class="data-table__scroll"
      role="region"
      :aria-label="`${caption} table`"
      tabindex="0"
      :aria-busy="loading"
    >
      <table>
        <caption>
          {{
            caption
          }}
        </caption>
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :style="{ textAlign: column.align ?? 'left' }"
            >
              <slot :name="`header-${column.key}`" :column="column">{{ column.label }}</slot>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="Math.max(columns.length, 1)" class="data-table__placeholder">
              <slot name="loading">Loading records…</slot>
            </td>
          </tr>
          <tr v-else-if="error">
            <td :colspan="Math.max(columns.length, 1)" class="data-table__placeholder">
              Records unavailable.
            </td>
          </tr>
          <tr v-else-if="!rows.length">
            <td :colspan="Math.max(columns.length, 1)" class="data-table__placeholder">
              <slot name="empty">No records found. Try changing your search or filters.</slot>
            </td>
          </tr>
          <template v-else>
            <tr v-for="row in rows" :key="rowKey(row)">
              <td
                v-for="column in columns"
                :key="column.key"
                :class="{ 'data-table__action-cell': column.key === 'actions' }"
                :style="{ textAlign: column.align ?? 'left' }"
              >
                <div v-if="column.key === 'actions'" class="data-table__row-actions">
                  <slot
                    name="cell-actions"
                    :row="row"
                    :column="column"
                    :value="cellValue(row, column)"
                  />
                </div>
                <slot
                  v-else
                  :name="`cell-${column.key}`"
                  :row="row"
                  :column="column"
                  :value="cellValue(row, column)"
                >
                  {{ cellValue(row, column) ?? '—' }}
                </slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <footer class="data-table__footer">
      <label>
        Rows per page
        <select :value="perPage" :disabled="loading" @change="updatePerPage">
          <option v-for="size in sizes" :key="size" :value="size">{{ size }}</option>
        </select>
      </label>
      <span v-if="!loading && !error">{{ start }}–{{ end }} of {{ total }}</span>
      <nav aria-label="Table pagination">
        <button
          type="button"
          aria-label="First page"
          :disabled="loading || !!error || page <= 1"
          @click="emit('update:page', 1)"
        >
          First
        </button>
        <button
          type="button"
          aria-label="Previous page"
          :disabled="loading || !!error || page <= 1"
          @click="emit('update:page', page - 1)"
        >
          Previous
        </button>
        <span v-if="!loading && !error">Page {{ page }} of {{ totalPages }}</span>
        <button
          type="button"
          aria-label="Next page"
          :disabled="loading || !!error || page >= totalPages"
          @click="emit('update:page', page + 1)"
        >
          Next
        </button>
        <button
          type="button"
          aria-label="Last page"
          :disabled="loading || !!error || page >= totalPages"
          @click="emit('update:page', totalPages)"
        >
          Last
        </button>
      </nav>
    </footer>
  </section>
</template>

<style scoped>
.data-table {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}
.data-table__toolbar,
.data-table__footer,
.data-table__actions,
nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.data-table__toolbar,
.data-table__footer {
  padding: 1rem;
}
.data-table__toolbar {
  align-items: flex-end;
}
.data-table__actions {
  margin-left: auto;
}
.data-table__search {
  display: grid;
  gap: 0.375rem;
}
.data-table__footer {
  justify-content: space-between;
  border-top: 1px solid #e2e8f0;
  font-size: 0.875rem;
}
button,
input,
select {
  font: inherit;
  color: inherit;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  padding: 0.5rem 0.75rem;
}
input {
  max-width: 100%;
}
button {
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: #f1f5f9;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
:is(button, input, select, .data-table__scroll):focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.data-table__scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}
caption {
  text-align: left;
  padding: 1rem;
  font-weight: 600;
}
th,
td {
  padding: 0.875rem 1rem;
  border-top: 1px solid #e2e8f0;
}
th {
  background: #f8fafc;
  font-weight: 600;
  white-space: nowrap;
}
.data-table__placeholder {
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
}
.data-table__error {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  color: #991b1b;
  background: #fef2f2;
}
.data-table__status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (max-width: 600px) {
  .data-table__search {
    width: 100%;
  }
  .data-table__actions {
    margin-left: 0;
  }
}
/* Shared treatment also reaches controls supplied by page slots. */
.data-table {
  border-radius: 16px;
  box-shadow: 0 4px 18px #0f172a05;
}
.data-table__toolbar {
  padding: 1.25rem;
  gap: 1rem;
  background: #fff;
}
.data-table__search {
  flex: 0 1 340px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
}
.data-table__search-input {
  position: relative;
}
.data-table__search-input > .app-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}
.data-table__search-input input {
  width: 100%;
  padding-left: 2.5rem;
}
.data-table__filters {
  padding: 1rem 1.25rem 1.25rem;
  background: #f8fafc;
  border-block: 1px solid #e8edf5;
}
.data-table__filter-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 0.85rem;
}
.data-table__filter-controls,
.data-table__filter-controls :deep(form) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: flex-end;
  width: 100%;
}
.data-table__filter-controls :deep(label) {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1 1 170px;
  max-width: 280px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
}
.data-table__filter-controls :deep([role='alert']) {
  flex-basis: 100%;
  color: #b91c1c;
  font-size: 0.875rem;
}
.data-table :deep(input),
.data-table :deep(select) {
  height: 40px;
  min-width: 0;
  border: 1px solid #d9e2ef;
  border-radius: 9px;
  background-color: white;
  font-size: 0.875rem;
  font-weight: 400;
  color: #334155;
  box-shadow: 0 1px 2px #0f172a04;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.data-table__filter-controls :deep(input),
.data-table__filter-controls :deep(select) {
  width: 100%;
  padding: 0.5rem 0.75rem;
}
.data-table :deep(button),
.data-table__actions :deep(a) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 38px;
  padding: 0.5rem 0.85rem;
  border: 1px solid #d9e2ef;
  border-radius: 9px;
  background: #fff;
  color: #475569;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 1px 2px #0f172a06;
  transition:
    background 0.15s,
    border-color 0.15s,
    box-shadow 0.15s;
}
.data-table :deep(button:hover:not(:disabled)),
.data-table__actions :deep(a:hover) {
  background: #eef2ff;
  border-color: #a5b4fc;
  color: #3730a3;
}
.data-table__actions :deep(.primary),
.data-table__filter-controls :deep(button[type='submit']) {
  background: #4f46e5;
  border-color: #4f46e5;
  color: white;
  box-shadow: 0 2px 5px #4f46e526;
}
.data-table__actions :deep(.primary:hover),
.data-table__filter-controls :deep(button[type='submit']:hover) {
  background: #4338ca;
  border-color: #4338ca;
  color: white;
}
.data-table :deep(:is(button, a, input, select):focus-visible) {
  outline: 3px solid #c7d2fe;
  outline-offset: 2px;
  border-color: #6366f1;
}
.data-table :deep(button:disabled) {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}
.data-table__action-cell {
  width: 1%;
  white-space: nowrap;
}
.data-table__row-actions,
.data-table__row-actions :deep(.row-actions),
.data-table__row-actions :deep(.actions) {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.data-table__row-actions :deep(button),
.data-table__row-actions :deep(a) {
  display: inline-flex;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid #dbe3ff;
  border-radius: 9px;
  color: #4f46e5;
  background: #eef2ff;
  box-shadow: none;
  text-decoration: none;
}
.data-table__row-actions :deep([aria-label^='Update status']) {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}
.data-table__row-actions :deep([aria-label^='Update price']) {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.data-table__row-actions :deep(:is(button, a):hover) {
  background: #e0e7ff;
  border-color: #a5b4fc;
  color: #3730a3;
  box-shadow: 0 2px 4px #312e8112;
}
.data-table__row-actions :deep(.action-label) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.data-table__row-actions :deep(svg) {
  width: 18px;
  height: 18px;
}
caption {
  color: #334155;
  font-size: 0.875rem;
  padding: 1rem 1.25rem;
}
th {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.055em;
  color: #64748b;
  background: #f8fafc;
}
td {
  vertical-align: middle;
  border-color: #edf1f7;
}
tbody tr:hover {
  background: #fafbff;
}
.data-table__footer {
  background: #fcfdff;
  color: #64748b;
  gap: 1rem;
}
.data-table__footer label {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}
.data-table__footer nav {
  gap: 0.4rem;
}
@media (max-width: 600px) {
  .data-table__toolbar,
  .data-table__filters {
    padding: 1rem;
  }
  .data-table__search {
    flex-basis: 100%;
  }
  .data-table__actions {
    width: 100%;
  }
  .data-table__filter-controls :deep(label) {
    flex: 1 1 140px;
    max-width: none;
  }
  .data-table__footer nav {
    width: 100%;
    justify-content: space-between;
  }
}
@media (prefers-reduced-motion: reduce) {
  .data-table :deep(*) {
    transition: none;
  }
}
</style>
