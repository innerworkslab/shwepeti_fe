export interface Warehouse {
  id: number
  name: string
  code: string
  is_active?: boolean
}
export interface CreateWarehouseInput {
  name: string
  code: string
}
export interface UpdateWarehouseInput extends CreateWarehouseInput {
  id: number
}
