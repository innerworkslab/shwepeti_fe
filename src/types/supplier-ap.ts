import type { Supplier } from './supplier'
export interface SupplierApBalance {
  id?: number
  supplier_id: number
  supplier?: Supplier | null
  balance_amount?: number | string | null
}
export interface SupplierApLedger {
  id: number
  supplier_id: number
  transaction_date?: string
  transaction_type?: string
  reference_type?: string
  reference_id?: number
  debit_amount?: number | string | null
  credit_amount?: number | string | null
  balance_amount?: number | string | null
  remark?: string | null
}
export interface CreateSupplierApPaymentInput {
  supplier_id: number
  cashbook_id: number
  amount: number
  payment_date: string
  remark: string
}
export interface UpdateSupplierApPaymentInput extends CreateSupplierApPaymentInput {
  id: number
}
