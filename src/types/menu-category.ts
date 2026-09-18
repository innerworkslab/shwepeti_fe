export interface MenuCategory {
  id: number
  name: string
  code: string
  description: string
  sort_order: number
  is_active?: boolean
}
export interface CreateMenuCategoryInput {
  name: string
  code: string
  description: string
  sort_order: number
}
export interface UpdateMenuCategoryInput extends CreateMenuCategoryInput {
  id: number
}
