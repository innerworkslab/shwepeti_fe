import type { Cashbook } from './cashbook'
export interface CreateCashbookTransactionInput {
  cashbook_id: number
  transaction_type: string
  amount: number
  transaction_date: string
  remark: string
}
export interface CashbookTransaction extends Omit<
  CreateCashbookTransactionInput,
  'amount' | 'remark'
> {
  id: number
  amount: number | string
  remark: string | null
  reference_no?: string
  balance_after?: number | string
  reference_type?: string | null
  reference_id?: number | null
  creator?: { id: number; name: string; email?: string } | null
  created_at?: string
  updated_at?: string
  cashbook?: Cashbook | null
}
export type CashbookTransactionFilters = {
  cashbook_id?: number
  date_from?: string
  date_to?: string
}
