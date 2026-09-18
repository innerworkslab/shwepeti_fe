export interface Adjustment {
  id: number
  transaction_date?: string
  remark?: string | null
  status?: string
}
export interface AdjustmentFilters {
  date_from?: string
  date_to?: string
}
