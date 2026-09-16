import type { PaginatedResponse } from './api'

export type DataTableFilterValue = string | number | boolean | null | undefined

export type DataTableQuery<Filters extends object = Record<never, never>> = Filters & {
  page: number
  perPage: number
  search: string
}

export type DataTableFetcher<Row, Filters extends object = Record<never, never>> = (
  params: DataTableQuery<Filters>,
  signal?: AbortSignal,
) => Promise<PaginatedResponse<Row>>

export interface DataTableColumn<Row> {
  /** Unique column ID; also names the cell slot: cell-{key}. */
  key: string
  label: string
  /** Omit for a slot-only column such as row actions. */
  field?: keyof Row
  format?: (row: Row) => string | number | null | undefined
  align?: 'left' | 'center' | 'right'
}
