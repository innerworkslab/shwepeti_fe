export type RoomStatus = string

export interface RoomBed {
  bed_type: string
  qty: number
}

export interface CreateRoomInput {
  name: string
  room_category_id: number
  price: number
  room_beds: RoomBed[]
}

export interface UpdateRoomInput extends CreateRoomInput {
  id: number
}

export interface Room extends CreateRoomInput {
  id: number
  status?: RoomStatus
  room_category?: { id: number; name: string } | null
}
