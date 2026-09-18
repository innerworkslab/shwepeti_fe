export type TransferStatus = 'posted'
export interface TransferLineInput {
  item_id: number
  unit_id: number
  quantity: number
  expiry_date: string
}
export interface CreateTransferInput {
  from_warehouse_id: number
  to_warehouse_id: number
  transaction_date: string
  remark: string
  items: TransferLineInput[]
}
export interface Transfer {
  id: number
  from_warehouse_id: number
  to_warehouse_id: number
  transaction_date: string
  remark: string
  status?: string
  from_warehouse?: { id: number; name: string } | null
  to_warehouse?: { id: number; name: string } | null
  items?: TransferLineInput[]
}
