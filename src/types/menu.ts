export interface MenuRecipe {
  item_id: number
  unit_id: number
  quantity: number
  remark: string
}
export interface CreateMenuInput {
  warehouse_id: number
  menu_category_id: number
  name: string
  code: string
  description: string
  price: number
  cost_price: number | null
  image_url: string | File | null
  recipes: MenuRecipe[]
}
export interface UpdateMenuInput extends CreateMenuInput {
  id: number
}
export interface Menu extends CreateMenuInput {
  id: number
  is_active?: boolean
  is_available?: boolean
  menu_category?: { id: number; name: string } | null
}
export interface MenuFilters {
  is_active?: number
}
