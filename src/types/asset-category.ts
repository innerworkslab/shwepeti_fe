export interface AssetCategory {
  id: number
  parent_id: number | null
  name: string
  code: string
  description: string | null
  is_active?: boolean
}

export interface CreateAssetCategoryInput {
  parent_id: number | null
  name: string
  code: string
  description: string | null
}

export interface UpdateAssetCategoryInput extends CreateAssetCategoryInput {
  id: number
}
