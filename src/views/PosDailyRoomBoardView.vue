<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { t, enumLabel } from '@/i18n'
import { posRoomManagement, type DailyBoard } from '@/services/pos-room-management.service'
import { statusLabel, statusStyle } from '@/constants/hotel-status'
import { toApiError } from '@/services/api/api-error'
import RoomDrawer from '@/components/pos/RoomDrawer.vue'
import RoomFormModal from '@/components/rooms/RoomFormModal.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { usePermissions } from '@/composables/usePermissions'
const { can } = usePermissions()
const board = ref<DailyBoard | null>(null),
  loading = ref(false),
  error = ref('')
const roomId = ref<number | null>(null),
  bookingId = ref<number | null>(null),
  statusId = ref<number | null>(null)
let controller: AbortController | undefined
async function load() {
  controller?.abort()
  const active = new AbortController()
  controller = active
  loading.value = true
  error.value = ''
  try {
    const result = await posRoomManagement.board(active.signal)
    if (!active.signal.aborted) board.value = result
  } catch (cause) {
    if (!active.signal.aborted) error.value = toApiError(cause).message
  } finally {
    if (!active.signal.aborted) loading.value = false
  }
}
function openRoom(id: number) {
  bookingId.value = null
  roomId.value = id
}
function openBooking(id: number) {
  roomId.value = null
  bookingId.value = id
}
function closeDrawer() {
  roomId.value = null
  bookingId.value = null
}
function saved() {
  statusId.value = null
  void load()
}
onMounted(load)
onBeforeUnmount(() => controller?.abort())
</script>
<template>
  <main class="board">
    <header>
      <h1>{{ t('Daily room board') }}</h1>
      <button :disabled="loading" @click="load">
        <AppIcon name="refresh" />{{ t('Refresh') }}
      </button>
    </header>
    <p v-if="loading" role="status">{{ t('Loading rooms…') }}</p>
    <p v-if="error" role="alert">{{ t(error) }}</p>
    <template v-if="board"
      ><p>{{ board.date }}</p>
      <dl class="summary">
        <div v-for="(value, key) in board.summary" :key="key">
          <dt>{{ enumLabel(key) }}</dt>
          <dd>{{ value }}{{ key === 'occupancy_percentage' ? '%' : '' }}</dd>
        </div>
      </dl>
      <section v-for="floor in board.floors" :key="floor.floor">
        <h2>{{ t('Floor') }} {{ floor.floor }}</h2>
        <dl class="floor-summary">
          <div v-for="(value, key) in floor.summary" :key="key">
            <dt>{{ enumLabel(key) }}</dt>
            <dd>{{ value }}{{ key === 'occupancy_percentage' ? '%' : '' }}</dd>
          </div>
        </dl>
        <div class="rooms">
          <article v-for="room in floor.rooms" :key="room.id">
            <button class="room-title" @click="openRoom(room.id)">
              <AppIcon name="rooms" />{{ room.name }}
            </button>
            <p>{{ room.room_category?.name }}</p>
            <p>{{ room.price }}</p>
            <span class="status" :style="statusStyle(room.status ?? '')">{{
              statusLabel(room.status ?? '')
            }}</span>
            <button
              v-if="can('rooms.update_status')"
              :title="t('Update status')"
              @click="statusId = room.id"
            >
              <AppIcon name="status" />
            </button>
            <button
              v-if="room.current_booking?.id && can('bookings.view')"
              @click="openBooking(room.current_booking.id)"
            >
              {{ room.current_booking.guest_name || t('Current booking') }}
            </button>
          </article>
        </div>
      </section>
      <p v-if="!board.floors.length">{{ t('No rooms found.') }}</p>
    </template>
    <RoomDrawer
      v-if="roomId != null || bookingId != null"
      :key="`${roomId}-${bookingId}`"
      :room-id="roomId ?? undefined"
      :selected-booking-id="bookingId ?? undefined"
      @close="closeDrawer"
      @updated="load"
    />
    <RoomFormModal
      v-if="statusId != null"
      :pos="true"
      :room-id="statusId"
      :status-only="true"
      @close="statusId = null"
      @saved="saved"
    />
  </main>
</template>
<style scoped>
.board {
  padding: 24px;
  color: #263b51;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.summary,
.rooms {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}
.summary > div,
article {
  padding: 18px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}
dd {
  margin: 6px 0;
  font-size: 22px;
  font-weight: 600;
}
dt {
  color: #64748b;
  font-size: 13px;
}
.floor-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.floor-summary dd {
  font-size: 16px;
}
button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  cursor: pointer;
  font: inherit;
}
.room-title {
  font-weight: 600;
}
.status {
  display: inline-block;
  border-radius: 20px;
  padding: 6px 10px;
  margin-right: 10px;
}
[role='alert'] {
  color: #b91c1c;
}
</style>
