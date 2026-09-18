export interface CreateUnitInput {
  unit_group_id: number
  name: string
  symbol: string
  is_base: boolean
}
export interface UpdateUnitInput extends CreateUnitInput {
  id: number
}
export interface Unit extends CreateUnitInput {
  id: number
  is_active?: boolean
  unit_group?: { id: number; name: string } | null
}
