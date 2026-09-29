export interface Cashbook {
  id: number
  code: string
  name: string
  type: string
  description?: string | null
  is_active?: boolean
}
export interface CreateCashbookInput {
  code: string
  name: string
  type: string
  description: string
}
export interface UpdateCashbookInput {
  id: number
  code: string
  name: string
  type: string
}
