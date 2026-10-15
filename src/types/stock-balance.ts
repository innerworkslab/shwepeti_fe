export interface StockBalance {
  id: number
  warehouse_id?: number
  item_id?: number
  unit_id?: number
  opening_balance?: number | string | null
  in_balance?: number | string | null
  out_balance?: number | string | null
  closing_balance?: number | string | null
  reserved_quantity?: number | string | null
  available_quantity?: number | string | null
  updated_at?: string
  quantity?: number | string | null
  warehouse?: { id: number; name: string } | null
  item?: {
    id: number
    name: string
    code?: string
    sku?: string
    min_stock?: number | string
    stock_unit?: { name: string; symbol?: string } | null
  } | null
  unit?: { id: number; name: string; symbol?: string } | null
}
export interface StockBalanceFilters {
  warehouse_id?: number
  date_from?: string
  date_to?: string
}
