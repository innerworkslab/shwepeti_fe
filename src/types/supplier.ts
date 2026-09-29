export interface CreateSupplierInput {
  supplier_code: string
  name: string
  phone_number: string
  email: string
  address: string
  bank_account_no: string
  credit_limit_amount: number
  supplier_type: string
  is_active: boolean
}
export interface UpdateSupplierInput extends CreateSupplierInput {
  id: number
}
export interface Supplier extends Omit<CreateSupplierInput, 'credit_limit_amount'> {
  id: number
  credit_limit_amount: number | string
}
