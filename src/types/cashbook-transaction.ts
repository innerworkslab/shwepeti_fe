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
  cashbook?: Cashbook | null
}
export type CashbookTransactionFilters = { date_from?: string; date_to?: string }
