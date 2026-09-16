export interface RoomCategory {
  id: number
  name: string
  description: string | null
  is_active?: boolean
}

export interface CreateRoomCategoryInput {
  name: string
  description: string
}

export interface UpdateRoomCategoryInput extends CreateRoomCategoryInput {
  id: number
  is_active: boolean
}
