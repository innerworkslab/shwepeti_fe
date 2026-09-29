// Provisional row fields until the backend record shape is supplied.
export interface StockBalance {
  id: number
  warehouse_id?: number
  item_id?: number
  unit_id?: number
  quantity?: number | string | null
  warehouse?: { id: number; name: string } | null
  item?: { id: number; name: string } | null
  unit?: { id: number; name: string; symbol?: string } | null
}
export interface StockBalanceFilters {
  warehouse_id?: number
  item_id?: number
}
