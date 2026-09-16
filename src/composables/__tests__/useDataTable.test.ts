import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useDataTable } from '../useDataTable'
import type { DataTableFetcher } from '@/types/data-table'
import type { PaginatedResponse } from '@/types/api'

interface Row {
  id: string
}
interface Filters {
  status?: string
  active?: boolean
  floor?: number
}
const scopes: ReturnType<typeof effectScope>[] = []
function setup(fetcher: DataTableFetcher<Row, Filters>, immediate = true) {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() =>
    useDataTable(fetcher, { immediate, initialFilters: { status: undefined } }),
  )!
}
const response = (page = 1, total = 65): PaginatedResponse<Row> => ({
  data: [{ id: `page-${page}` }],
  total,
  page,
  perPage: 20,
})
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
  vi.useRealTimers()
})

describe('useDataTable', () => {
  it('loads on creation and passes page, search, filters, and a cancellation signal', async () => {
    const fetcher = vi.fn<DataTableFetcher<Row, Filters>>().mockResolvedValue(response())
    const table = setup(fetcher)
    expect(table.loading.value).toBe(true)
    await flushPromises()
    expect(fetcher).toHaveBeenCalledWith(
      { page: 1, perPage: 20, search: '', status: undefined },
      expect.any(AbortSignal),
    )
    expect(table.rows.value).toEqual([{ id: 'page-1' }])
    expect(table.totalPages.value).toBe(4)
    expect(table.loading.value).toBe(false)
  })

  it('debounces search, resets pagination, and sends only the final search', async () => {
    vi.useFakeTimers()
    const fetcher = vi
      .fn<DataTableFetcher<Row, Filters>>()
      .mockImplementation(async (query) => response(query.page))
    const table = setup(fetcher)
    await flushPromises()
    table.setPage(3)
    await flushPromises()
    fetcher.mockClear()
    table.setSearch('su')
    table.setSearch('suite ')
    expect(table.page.value).toBe(1)
    await vi.advanceTimersByTimeAsync(299)
    expect(fetcher).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0]?.[0].search).toBe('suite')
  })

  it('merges and clears filters, preserving false and zero, and resets page size changes', async () => {
    const fetcher = vi
      .fn<DataTableFetcher<Row, Filters>>()
      .mockImplementation(async (query) => ({ ...response(query.page), perPage: query.perPage }))
    const table = setup(fetcher)
    await flushPromises()
    table.setPage(2)
    await flushPromises()
    table.setFilters({ status: 'available', active: false, floor: 0 })
    await flushPromises()
    expect(fetcher.mock.lastCall?.[0]).toMatchObject({
      page: 1,
      active: false,
      floor: 0,
      status: 'available',
    })
    table.setFilters({ status: undefined })
    await flushPromises()
    expect(table.filters.value).toEqual({ status: undefined, active: false, floor: 0 })
    table.setPerPage(50)
    await flushPromises()
    expect(fetcher.mock.lastCall?.[0]).toMatchObject({ page: 1, perPage: 50 })
    table.reset()
    await flushPromises()
    expect(table.filters.value).toEqual({ status: undefined })
    expect(table.perPage.value).toBe(50)
  })

  it('ignores stale responses even during the search debounce window', async () => {
    vi.useFakeTimers()
    let resolveOld!: (value: PaginatedResponse<Row>) => void
    const fetcher = vi
      .fn<DataTableFetcher<Row, Filters>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve
          }),
      )
      .mockResolvedValue({ ...response(), data: [{ id: 'new' }] })
    const table = setup(fetcher)
    table.setSearch('new')
    expect(fetcher.mock.calls[0]?.[1]?.aborted).toBe(true)
    resolveOld(response())
    await flushPromises()
    expect(table.rows.value).toEqual([])
    expect(table.loading.value).toBe(true)
    await vi.advanceTimersByTimeAsync(300)
    expect(table.rows.value).toEqual([{ id: 'new' }])
  })

  it('shows errors and allows retry without leaving loading stuck', async () => {
    const fetcher = vi
      .fn<DataTableFetcher<Row, Filters>>()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValue(response())
    const table = setup(fetcher)
    await flushPromises()
    expect(table.error.value?.message).toBe('Offline')
    expect(table.loading.value).toBe(false)
    await table.refresh()
    expect(table.error.value).toBeNull()
    expect(table.rows.value).toHaveLength(1)
  })

  it('corrects an empty last page after deletion', async () => {
    const fetcher = vi
      .fn<DataTableFetcher<Row, Filters>>()
      .mockImplementation(async (query) => response(query.page))
    const table = setup(fetcher)
    await flushPromises()
    table.setPage(4)
    await flushPromises()
    fetcher
      .mockResolvedValueOnce({ ...response(4, 60), data: [] })
      .mockResolvedValueOnce(response(3, 60))
    await table.refresh()
    expect(table.page.value).toBe(3)
    expect(table.total.value).toBe(60)
    expect(fetcher.mock.lastCall?.[0].page).toBe(3)
  })

  it('cancels work on scope disposal and supports manual initial loading', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<DataTableFetcher<Row, Filters>>().mockResolvedValue(response())
    const table = setup(fetcher, false)
    expect(fetcher).not.toHaveBeenCalled()
    await table.refresh()
    const signal = fetcher.mock.lastCall?.[1]
    table.setSearch('pending')
    scopes[0]?.stop()
    await vi.advanceTimersByTimeAsync(1000)
    expect(signal?.aborted).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
