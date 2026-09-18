type LedgerDecimal = string | number
export interface InventoryLedger {
  id: number
  item_id: number
  warehouse_id: number
  transaction_type: string
  reference_type: string
  reference_id: number
  quantity: LedgerDecimal
  unit_id: number
  base_quantity: LedgerDecimal
  unit_cost: LedgerDecimal | null
  total_cost: LedgerDecimal | null
  batch_no: string | null
  expiry_date: string | null
  balance_quantity: LedgerDecimal
  transaction_date: string
  remark: string | null
  created_by: number | null
  item?: { id: number; name: string; code?: string } | null
  warehouse?: { id: number; name: string; code?: string } | null
  unit?: { id: number; name: string; symbol?: string } | null
  creator?: { id: number; name: string } | null
  created_at?: string
  updated_at?: string
}
