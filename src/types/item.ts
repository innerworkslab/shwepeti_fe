export interface ItemUnitConversion {
  from_unit_id: number
  to_unit_id: number
  conversion_factor: number
}
export interface CreateItemInput {
  item_category_id: number
  name: string
  code: string
  stock_unit_id: number
  description: string | null
  min_stock: number
  item_unit_conversions: ItemUnitConversion[]
}
export interface UpdateItemInput extends CreateItemInput {
  id: number
}
export interface Item extends CreateItemInput {
  id: number
  is_active?: boolean
  price?: number | string | null
  item_category?: { id: number; name: string } | null
  stock_unit?: { id: number; name: string; symbol?: string } | null
}
