import type { Supplier } from './supplier'
export interface SupplierApBalance {
  id?: number
  supplier_code?: string
  supplier_name?: string
  supplier_type?: string
  credit_limit_amount?: string | number
  payable_balance?: string | number
  available_credit_amount?: string | number
  is_active?: boolean
  supplier_id: number
  supplier?: Supplier | null
  balance_amount?: number | string | null
}
export interface SupplierApLedger {
  amount?: string | number | null
  supplier?: Supplier | null
  creator?: { id: number; name: string } | null
  created_at?: string
  balance_after?: string | number | null
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

export interface SupplierApPayment {
  id: number
  reference_no: string
  supplier_id: number
  cashbook_id: number
  amount: number | string
  payment_date: string
  status: string
  remark: string | null
  supplier?: Supplier | null
  cashbook?: import('./cashbook').Cashbook | null
  creator?: { id: number; name: string; email?: string } | null
  created_at?: string
  updated_at?: string
}
