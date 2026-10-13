<script setup lang="ts">
import { statusLabel, statusStyle } from '@/constants/hotel-status'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import BookingActions from './BookingActions.vue'
import ServiceOrderPanel from './ServiceOrderPanel.vue'
import FoodOrderPanel from './FoodOrderPanel.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { posRoomService } from '@/services/pos-room.service'
import { toApiError } from '@/services/api/api-error'
import type { PosRoom } from '@/types/pos-room'
const props = defineProps<{ roomId: number }>()
const emit = defineEmits<{ close: []; updated: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const room = ref<PosRoom | null>(null)
const busy = ref(false)
const serviceTab = ref<'food' | 'amenity' | 'laundry'>('food')
const visited = ref({ food: true, amenity: false, laundry: false })
function selectService(tab: 'food' | 'amenity' | 'laundry') {
  if (!busy.value) {
    serviceTab.value = tab
    visited.value[tab] = true
  }
}
const bookingId = computed(() => {
  const id = room.value?.current_booking?.id
  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : null
})
const canOrder = computed(() =>
  ['reserved', 'checked_in'].includes(String(room.value?.current_booking?.status || '')),
)
function close() {
  if (!busy.value) emit('close')
}
const loading = ref(false)
const error = ref('')
let controller: AbortController | undefined
let disposed = false
let previousFocus: HTMLElement | null = null
async function bookingSaved() {
  emit('updated')
  await load()
}
async function load() {
  controller?.abort()
  const active = new AbortController()
  controller = active
  loading.value = true
  error.value = ''
  room.value = null
  try {
    const result = await posRoomService.get(props.roomId, active.signal)
    if (!disposed && !active.signal.aborted) room.value = result
  } catch (cause) {
    if (!disposed && !active.signal.aborted) error.value = toApiError(cause).message
  } finally {
    if (!disposed && !active.signal.aborted) loading.value = false
  }
}
watch(() => props.roomId, load, { immediate: true })
onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value?.showModal()
})
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
  dialog.value?.close()
  previousFocus?.focus()
})
function backdrop(event: MouseEvent) {
  if (dialog.value && event.target === dialog.value) {
    const box = dialog.value.getBoundingClientRect()
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      close()
  }
}
</script>
<template>
  <dialog
    ref="dialog"
    class="room-drawer"
    aria-labelledby="room-drawer-title"
    @cancel.prevent="close()"
    @click="backdrop"
  >
    <header>
      <div>
        <span class="eyebrow">ROOM DETAILS</span>
        <h2 id="room-drawer-title">{{ room?.name || `Room #${roomId}` }}</h2>
      </div>
      <button type="button" :disabled="busy" aria-label="Close room details" @click="close()">
        <AppIcon name="close" />
      </button>
    </header>
    <div class="drawer-body" :aria-busy="loading">
      <p v-if="loading" role="status" class="muted">Loading room details...</p>
      <div v-else-if="error" role="alert" class="error">
        <p>{{ error }}</p>
        <button type="button" @click="load">Try again</button>
      </div>
      <template v-else-if="room">
        <div class="room-summary">
          <span class="room-symbol"><AppIcon name="rooms" :size="30" /></span>
          <div>
            <span class="muted">{{
              room.room_category?.name || `Category #${room.room_category_id}`
            }}</span>
            <h3>{{ room.name }}</h3>
          </div>
          <span class="status" :class="room.status" :style="statusStyle(room.status)">{{
            statusLabel(room.status)
          }}</span>
        </div>
        <details>
          <summary>Room information</summary>
          <dl>
            <dt>Room ID</dt>
            <dd>{{ room.id }}</dd>
            <dt>Category</dt>
            <dd>{{ room.room_category?.name || '-' }}</dd>
            <dt>Price</dt>
            <dd class="price">{{ room.price }}</dd>
            <dt>Last updated</dt>
            <dd>{{ room.updated_at }}</dd>
          </dl>
          <p v-if="room.room_category?.description" class="description">
            {{ room.room_category.description }}
          </p>
        </details>
        <section>
          <h3>Current booking</h3>
          <div v-if="bookingId" class="booking-info">
            <strong>{{ room.current_booking?.guest_name || `Booking #${bookingId}` }}</strong>
            <p>{{ room.current_booking?.booking_no }}</p>
            <span>{{ statusLabel(String(room.current_booking?.status || '')) }}</span>
          </div>
          <div v-else class="booking-state">
            <AppIcon name="calendar" :size="22" />
            <p>
              {{ room.current_booking ? 'This room has a current booking.' : 'No current booking' }}
            </p>
          </div>
        </section>
        <BookingActions
          v-if="bookingId"
          :key="`booking-${room.id}-${bookingId}`"
          :booking-id="bookingId"
          :disabled="busy"
          @busy="busy = $event"
          @saved="bookingSaved"
        />
        <nav v-if="bookingId" class="service-tabs" aria-label="Room services">
          <button
            v-for="tab in ['food', 'amenity', 'laundry'] as const"
            :key="tab"
            type="button"
            :disabled="busy"
            :aria-pressed="serviceTab === tab"
            @click="selectService(tab)"
          >
            {{ tab === 'food' ? 'Food & beverages' : tab === 'amenity' ? 'Amenities' : 'Laundry' }}
          </button>
        </nav>
        <template v-for="type in ['amenity', 'laundry'] as const" :key="type">
          <ServiceOrderPanel
            v-show="serviceTab === type"
            :key="`${room.id}-${bookingId}-${type}`"
            v-if="bookingId && visited[type]"
            :room-id="room.id"
            :booking-id="bookingId"
            :can-order="canOrder"
            :service-type="type"
            @busy="busy = $event"
          />
        </template>
        <FoodOrderPanel
          v-show="serviceTab === 'food'"
          v-if="bookingId"
          :key="`${room.id}-${bookingId}`"
          :room-id="room.id"
          :booking-id="bookingId"
          :can-order="canOrder"
          @busy="busy = $event"
        />
      </template>
    </div>
    <footer>
      <button :disabled="busy" type="button" @click="close()">Back to calendar</button>
    </footer>
  </dialog>
</template>
<style scoped>
.service-tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 22px;
}
.service-tabs button {
  flex: 1;
  padding: 9px 5px;
  font-size: 11px;
}
.service-tabs button[aria-pressed='true'] {
  color: #036985;
  background: #ecfeff;
  border-color: #22b8cf;
}
.room-drawer {
  position: fixed;
  inset: 0 0 0 auto;
  margin: 0;
  width: min(460px, 100vw);
  height: 100dvh;
  max-height: 100dvh;
  max-width: 100vw;
  padding: 0;
  border: 0;
  background: white;
  color: #334155;
  box-shadow: -12px 0 50px #0f172a20;
}
.room-drawer[open] {
  display: flex;
  flex-direction: column;
}
.room-drawer::backdrop {
  background: #1c304875;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 24px;
  border-bottom: 1px solid #e8eef5;
}
.eyebrow {
  color: #8b9aaf;
  letter-spacing: 1.6px;
  font-size: 10px;
  font-weight: 700;
}
h2 {
  font-size: 21px;
  margin: 7px 0 0;
}
h3 {
  font-size: 13px;
  margin: 0 0 16px;
}
button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font: inherit;
  padding: 9px 12px;
  border: 1px solid #e0e7ef;
  border-radius: 6px;
  background: white;
  color: #52637c;
  cursor: pointer;
}
button:hover {
  background: #f0f8fc;
}
button:focus-visible {
  outline: 2px solid #12a9df;
  outline-offset: 3px;
}
.drawer-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}
.room-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 0 26px;
}
.room-summary h3 {
  font-size: 17px;
  margin: 5px 0 0;
}
.room-symbol {
  background: #eaf7fe;
  color: #19a7d7;
  border-radius: 12px;
  padding: 13px;
}
.status {
  margin-left: auto;
  border-radius: 20px;
  padding: 5px 9px;
  font-size: 10px;
  text-transform: capitalize;
  color: #64748b;
  background: #f1f5f9;
}
.status.available {
  color: #15803d;
  background: #e8faef;
}
.status.cleaning {
  color: #b7791f;
  background: #fff6dd;
}
section {
  border-top: 1px solid #edf1f6;
  padding: 24px 0;
}
dl {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 17px;
  font-size: 12px;
}
dt {
  color: #8b9aaf;
}
dd {
  text-align: right;
  margin: 0;
  overflow-wrap: anywhere;
}
.price {
  font-weight: 700;
}
.muted,
.description {
  font-size: 12px;
  color: #8493a8;
  line-height: 1.6;
}
.description {
  background: #f8fafc;
  padding: 12px;
  border-radius: 6px;
  margin-top: 22px;
}
.booking-state {
  text-align: center;
  padding: 26px 12px;
  background: #f8fafc;
  border: 1px dashed #dce5ef;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 12px;
}
.error {
  color: #b91c1c;
  font-size: 13px;
}
footer {
  padding: 18px 24px;
  border-top: 1px solid #e8eef5;
}
footer button {
  width: 100%;
}
</style>
