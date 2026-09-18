export type StockInStatus = 'posted' | 'cancelled'
export interface StockInLineInput {
  item_id: number
  unit_id: number
  quantity: number
  unit_cost: number
}
export interface CreateStockInInput {
  warehouse_id: number
  transaction_date: string
  items: StockInLineInput[]
}
export interface StockIn {
  id: number
  warehouse_id: number
  transaction_date: string
  status?: string
  warehouse?: { id: number; name: string } | null
  items?: StockInLineInput[]
}
