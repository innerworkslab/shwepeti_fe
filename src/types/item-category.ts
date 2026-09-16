export interface ItemCategory {
  id: number
  parent_id: number | null
  name: string
  code: string
  description: string | null
  is_active?: boolean
}

export interface CreateItemCategoryInput {
  parent_id: number | null
  name: string
  code: string
  description: string | null
}

export interface UpdateItemCategoryInput extends CreateItemCategoryInput {
  id: number
}
