<script setup lang="ts" generic="Row extends object">
import { computed } from 'vue'
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
        <input
          type="search"
          :value="search"
          :placeholder="searchPlaceholder"
          @input="updateSearch"
        />
      </label>
      <slot name="filters" />
      <div class="data-table__actions">
        <slot name="toolbar" />
        <button type="button" :disabled="loading" @click="emit('refresh')">Refresh</button>
      </div>
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
                :style="{ textAlign: column.align ?? 'left' }"
              >
                <slot
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
</style>
