import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'
import axios from 'axios'
import { toApiError } from '@/services/api/api-error'
import type { ApiError } from '@/services/api/api-error'
import type { DataTableFetcher, DataTableFilterValue } from '@/types/data-table'

export interface UseDataTableOptions<Filters> {
  initialPage?: number
  initialPerPage?: number
  initialSearch?: string
  initialFilters?: Filters
  debounceMs?: number
  immediate?: boolean
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`)
  }
  return value
}

export function useDataTable<
  Row,
  Filters extends { [Key in keyof Filters]: DataTableFilterValue } = Record<never, never>,
>(fetcher: DataTableFetcher<Row, Filters>, options: UseDataTableOptions<Filters> = {}) {
  const rows = shallowRef<Row[]>([])
  const total = ref(0)
  const page = ref(positiveInteger(options.initialPage ?? 1, 'initialPage'))
  const perPage = ref(positiveInteger(options.initialPerPage ?? 20, 'initialPerPage'))
  const search = ref(options.initialSearch ?? '')
  const initialFilters = { ...options.initialFilters } as Filters
  const filters = shallowRef<Readonly<Filters>>(Object.freeze({ ...initialFilters }))
  const loading = ref(false)
  const error = shallowRef<ApiError | null>(null)
  const debounceMs = options.debounceMs ?? 300
  if (!Number.isFinite(debounceMs) || debounceMs < 0) {
    throw new Error('debounceMs must be a non-negative number.')
  }

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
  let controller: AbortController | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let requestId = 0
  let disposed = false

  function invalidate() {
    requestId++
    controller?.abort()
    clearTimeout(timer)
    timer = undefined
  }

  async function refresh(): Promise<void> {
    if (disposed) return
    invalidate()
    const id = requestId
    const activeController = new AbortController()
    controller = activeController
    loading.value = true
    error.value = null
    rows.value = []

    try {
      // One corrective fetch handles deleting the final row on the last page.
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await fetcher(
          {
            ...filters.value,
            page: page.value,
            perPage: perPage.value,
            search: search.value.trim(),
          },
          activeController.signal,
        )
        // Protect against services that do not honor AbortSignal.
        if (id !== requestId || disposed) return
        if (
          !Array.isArray(result.data) ||
          !Number.isSafeInteger(result.total) ||
          result.total < 0 ||
          !Number.isSafeInteger(result.page) ||
          result.page < 1 ||
          !Number.isSafeInteger(result.perPage) ||
          result.perPage < 1
        ) {
          throw new Error('Invalid paginated response. Expected data, total, page, and perPage.')
        }
        const lastPage = Math.max(1, Math.ceil(result.total / result.perPage))
        if (result.page > lastPage) {
          if (attempt === 1) throw new Error('The API returned an out-of-range page.')
          page.value = lastPage
          perPage.value = result.perPage
          continue
        }
        rows.value = result.data
        total.value = result.total
        page.value = result.page
        perPage.value = result.perPage
        break
      }
    } catch (cause) {
      if (id !== requestId || disposed) return
      if (!axios.isCancel(cause) && !activeController.signal.aborted) {
        error.value = toApiError(cause)
        total.value = 0
      }
    } finally {
      if (id === requestId && !disposed) loading.value = false
    }
  }

  function schedule(delay = 0) {
    if (disposed) return
    invalidate()
    rows.value = []
    error.value = null
    loading.value = true
    if (delay === 0) void refresh()
    else timer = setTimeout(() => void refresh(), delay)
  }

  function setPage(value: number) {
    const next = Math.min(positiveInteger(value, 'page'), totalPages.value)
    if (next === page.value) return
    page.value = next
    schedule()
  }

  function setPerPage(value: number) {
    positiveInteger(value, 'perPage')
    if (value === perPage.value) return
    perPage.value = value
    page.value = 1
    schedule()
  }

  function setSearch(value: string) {
    if (value === search.value) return
    search.value = value
    page.value = 1
    schedule(debounceMs)
  }

  /** Merge flat filter values. Pass undefined to clear an optional filter. */
  function setFilters(values: Partial<Filters>) {
    filters.value = Object.freeze({ ...filters.value, ...values })
    page.value = 1
    schedule()
  }

  /** Clear search and restore the initial filters, keeping the chosen page size. */
  function reset() {
    search.value = ''
    filters.value = Object.freeze({ ...initialFilters })
    page.value = 1
    schedule()
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true
      invalidate()
      loading.value = false
    })
  }
  if (options.immediate !== false) void refresh()

  return {
    rows: computed(() => rows.value),
    total: computed(() => total.value),
    page: computed(() => page.value),
    perPage: computed(() => perPage.value),
    search: computed(() => search.value),
    filters: computed(() => filters.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    totalPages,
    setPage,
    setPerPage,
    setSearch,
    setFilters,
    reset,
    refresh,
  }
}
