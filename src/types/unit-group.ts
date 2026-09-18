export interface UnitGroup {
  id: number
  name: string
  is_active?: boolean
}
export interface CreateUnitGroupInput {
  name: string
}
export interface UpdateUnitGroupInput extends CreateUnitGroupInput {
  id: number
}
