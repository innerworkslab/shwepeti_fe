export interface AssetDocument {
  name: string
  path: string | File
}
export interface CreateFixedAssetInput {
  asset_code: string
  asset_category_id: number
  cashbook_id: number
  name: string
  serial_number: string
  purchase_date: string
  purchase_amount: number
  location: string
  depreciation_enabled: boolean
  depreciation_start_date?: string
  useful_life_months?: number
  residual_value?: number
  documents: AssetDocument[]
  remark: string
}
export interface UpdateFixedAssetInput extends CreateFixedAssetInput {
  id: number
}
export interface FixedAsset extends Omit<CreateFixedAssetInput, 'purchase_amount'> {
  id: number
  purchase_amount: number | string
  status?: 'posted' | 'cancelled' | string
  asset_category?: { id: number; name: string } | null
  cashbook?: { id: number; name: string } | null
}
export type FixedAssetFilters = {
  asset_category_id?: number
  cashbook_id?: number
  date_from?: string
  date_to?: string
}

export interface FixedAssetDepreciation {
  id: number
  fixed_asset_id: number
  period: string
  amount: string | number
  opening_book_value: string | number
  closing_book_value: string | number
  created_at: string
}
