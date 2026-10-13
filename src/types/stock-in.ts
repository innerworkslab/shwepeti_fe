export type StockInStatus = 'posted' | 'cancelled'
export interface StockInLineInput {
  item_id: number
  unit_id: number
  quantity: number
  unit_cost: number
}
export interface CreateStockInInput {
  supplier_id: number
  cashbook_id: number
  total_amount: number
  paid_amount: number
  warehouse_id: number
  transaction_date: string
  items: StockInLineInput[]
}
export interface StockInLine {
  item_id: number
  unit_id: number
  quantity: string | number
  unit_cost: string | number
  item?: { id: number; name: string } | null
  unit?: { id: number; name: string; symbol?: string } | null
}
export interface StockIn {
  reference_no?: string
  supplier_id?: number | null
  cashbook_id?: number | null
  supplier?: { id: number; name: string } | null
  cashbook?: { id: number; name: string } | null
  total_amount?: string | number
  paid_amount?: string | number
  payable_amount?: string | number
  remark?: string | null
  creator?: { id: number; name: string } | null
  created_at?: string

  id: number
  warehouse_id: number
  transaction_date: string
  status?: string
  warehouse?: { id: number; name: string } | null
  items?: StockInLine[]
}
