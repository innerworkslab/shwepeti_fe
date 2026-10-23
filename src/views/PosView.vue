<script setup lang="ts">
import { statusLabel, statusStyle } from '@/constants/hotel-status'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import RoomDrawer from '@/components/pos/RoomDrawer.vue'
import { usePosSessionStore } from '@/stores/pos-session'
import { posDashboardService } from '@/services/pos-dashboard.service'
import { toApiError } from '@/services/api/api-error'
import type { BookingDashboard, DashboardRoom, DashboardBooking } from '@/types/pos-dashboard'
const session = usePosSessionStore()
const today = new Date()
today.setHours(0, 0, 0, 0)
const start = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const end = ref(new Date(today.getFullYear(), today.getMonth() + 1, 0))
const selectionAnchor = ref<Date | null>(null)
const calendarMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const calendarScroll = ref<HTMLElement | null>(null)
let initialPositionSet = false
async function centerToday() {
  await nextTick()
  const container = calendarScroll.value
  const cell = container?.querySelector<HTMLElement>('.day.today')
  if (!container || !cell || initialPositionSet) return
  const viewport = container.getBoundingClientRect()
  const rect = cell.getBoundingClientRect()
  container.scrollLeft = Math.max(
    0,
    container.scrollLeft + rect.left - viewport.left + rect.width / 2 - container.clientWidth / 2,
  )
  initialPositionSet = true
}
const query = ref('')
const typeFilter = ref('all')
const collapsed = ref<string[]>([])
const availableOnly = ref(false)
const dashboard = ref<BookingDashboard | null>(null)
const loading = ref(true)
const loadError = ref('')
const selectedRoomId = ref<number | null>(null)
let controller: AbortController | undefined
let disposed = false
async function loadRooms() {
  controller?.abort()
  const active = new AbortController()
  controller = active
  loading.value = true
  loadError.value = ''
  dashboard.value = null
  try {
    const result = await posDashboardService.get(
      { start_date: dateKey(start.value), end_date: dateKey(end.value) },
      active.signal,
    )
    if (!disposed && !active.signal.aborted) dashboard.value = result
  } catch (cause) {
    if (!disposed && !active.signal.aborted) loadError.value = toApiError(cause).message
  } finally {
    if (!disposed && !active.signal.aborted) {
      loading.value = false
      if (!loadError.value) void centerToday()
    }
  }
}
onMounted(loadRooms)
watch([start, end], loadRooms)
const groups = computed(() =>
  (dashboard.value?.room_categories ?? []).map((group) => ({
    ...group,
    id: String(group.id),
    description: '',
    rooms: group.rooms.map((room) => ({
      ...room,
      bookings: (group.bookings ?? []).filter(
        (booking) => String(booking.roomId) === String(room.id),
      ),
    })),
  })),
)
type RoomGroup = (typeof groups.value)[number]
function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}
const days = computed(() => {
  const first = calendarMonth.value
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return Array.from({ length: count }, (_, index) => addDays(first, index))
})
const dayCount = computed(() => days.value.length)
const years = computed(() =>
  Array.from({ length: 9 }, (_, i) => calendarMonth.value.getFullYear() - 4 + i),
)
const months = Array.from({ length: 12 }, (_, i) =>
  new Date(2026, i, 1).toLocaleString('en', { month: 'short' }),
)
const rangeLabel = computed(() => {
  const format = (date: Date) =>
    date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
  return dateKey(start.value) === dateKey(end.value)
    ? format(start.value)
    : `${format(start.value)} – ${format(end.value)}`
})
const visibleGroups = computed(() =>
  groups.value
    .filter((g) => typeFilter.value === 'all' || g.id === typeFilter.value)
    .map((g) => ({
      ...g,
      rooms: g.rooms.filter(
        (room) =>
          (!availableOnly.value || room.status === 'available') &&
          `${room.name} ${room.id} ${room.bookings.map((b) => b.guestName).join(' ')}`
            .toLowerCase()
            .includes(query.value.trim().toLowerCase()),
      ),
    }))
    .filter((g) => g.rooms.length),
)
function available(group: RoomGroup, day: Date) {
  return group.availability.find((entry) => entry.date === dateKey(day))?.available_count ?? null
}
function availabilityTitle(group: RoomGroup, day: Date) {
  const entry = group.availability.find((value) => value.date === dateKey(day))
  return entry
    ? `${entry.date}: ${entry.available_count} available, ${entry.booked_count} booked, ${entry.total_count} total`
    : 'Availability not supplied'
}
// Use calendar-day positions, independent of daylight-saving transitions.
function dayNumber(value: string) {
  return Date.parse(`${value.slice(0, 10)}T00:00:00Z`) / 86400000
}
function bookingBars(room: DashboardRoom & { bookings: DashboardBooking[] }) {
  const first = days.value[0]
  if (!first || !dayCount.value) return []
  const firstDay = dayNumber(dateKey(first))
  const lanes: number[] = []
  return room.bookings
    .map((booking, index) => ({
      booking,
      key: `${booking.roomId}-${booking.start_date_time}-${booking.end_date_time}-${index}`,
      from: dayNumber(booking.start_date_time) - firstDay,
      to: dayNumber(booking.end_date_time) - firstDay,
    }))
    .filter(
      (bar) =>
        Number.isFinite(bar.from) &&
        Number.isFinite(bar.to) &&
        bar.to >= bar.from &&
        bar.to >= 0 &&
        bar.from < dayCount.value,
    )
    .sort((a, b) => a.from - b.from || a.key.localeCompare(b.key))
    .map((bar) => {
      const from = Math.max(0, bar.from),
        to = Math.min(dayCount.value - 1, bar.to)
      let lane = lanes.findIndex((last) => last < from)
      if (lane < 0) lane = lanes.length
      lanes[lane] = to
      return {
        ...bar,
        lane,
        style: {
          left: `${(from / dayCount.value) * 100}%`,
          width: `${((to - from + 1) / dayCount.value) * 100}%`,
          top: `${6 + lane * 36}px`,
          ...statusStyle(bar.booking.status),
          borderLeftColor: /^#[0-9a-f]{6}$/i.test(bar.booking.colorCode)
            ? bar.booking.colorCode
            : statusStyle(bar.booking.status).color,
        },
      }
    })
}
function timelineHeight(room: DashboardRoom & { bookings: DashboardBooking[] }) {
  return `${Math.max(44, ...bookingBars(room).map((bar) => (bar.lane + 1) * 36 + 12))}px`
}

function toggleGroup(id: string) {
  collapsed.value = collapsed.value.includes(id)
    ? collapsed.value.filter((value) => value !== id)
    : [...collapsed.value, id]
}
function selectDay(day: Date) {
  if (!selectionAnchor.value) {
    selectionAnchor.value = new Date(day)
    start.value = new Date(day)
    end.value = new Date(day)
  } else {
    const anchor = selectionAnchor.value
    start.value = new Date(day < anchor ? day : anchor)
    end.value = new Date(day < anchor ? anchor : day)
    selectionAnchor.value = null
  }
}
function selectedDay(day: Date) {
  return day >= start.value && day <= end.value
}
function shift(amount: number) {
  calendarMonth.value = new Date(
    calendarMonth.value.getFullYear(),
    calendarMonth.value.getMonth() + (amount < 0 ? -1 : 1),
    1,
  )
}
function selectMonth(month: number) {
  calendarMonth.value = new Date(calendarMonth.value.getFullYear(), month, 1)
}
function selectYear(year: number) {
  calendarMonth.value = new Date(year, calendarMonth.value.getMonth(), 1)
}
function showToday() {
  calendarMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectionAnchor.value = null
  start.value = new Date(today)
  end.value = new Date(today)
}
const dialog = ref<HTMLDialogElement | null>(null)
const panel = ref('')
let previousFocus: HTMLElement | null = null
async function openPanel(name: string) {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  panel.value = name
  await nextTick()
  if (!disposed) dialog.value?.showModal()
}
function closePanel() {
  dialog.value?.close()
  panel.value = ''
  previousFocus?.focus()
}
function setAllGroups(collapse: boolean) {
  collapsed.value = collapse ? groups.value.map((g) => g.id) : []
  closePanel()
}
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
  dialog.value?.close()
})
</script>
<template>
  <main class="pos-shell">
    <header class="workspace-heading">
      <div class="brand">
        <span class="brand-mark">SP</span>
        <div>
          <span class="eyebrow">SHWE PETIT</span>
          <h1>Reservation calendar</h1>
        </div>
      </div>
      <div class="staff">
        <span class="demo-badge">Room overview</span
        ><span class="staff-avatar"><AppIcon name="user" :size="20" /></span
        ><span>{{ session.user?.name || 'POS Staff' }}<small>Front desk workspace</small></span>
      </div>
    </header>
    <section class="calendar-card" aria-label="Room booking calendar">
      <div class="toolbar">
        <nav class="workspace-tools" aria-label="Calendar tools">
          <button
            v-for="tool in ['Housekeeping', 'Facilities', 'Room types', 'Booking options']"
            :key="tool"
            @click="openPanel(tool)"
          >
            {{ tool }}<AppIcon name="chevronDown" :size="12" />
          </button>
        </nav>
        <div class="booking-tools">
          <label class="available-filter"
            ><input v-model="availableOnly" type="checkbox" /> Currently available rooms only</label
          ><button type="button" :disabled="loading" aria-label="Refresh rooms" @click="loadRooms">
            <AppIcon name="refresh" :size="16" />
          </button>
          <label class="search"
            ><AppIcon name="search" :size="16" /><input
              v-model="query"
              type="search"
              aria-label="Search rooms"
              placeholder="Search rooms or guests" /></label
          ><button
            class="icon-button"
            title="Calendar display options"
            aria-label="Calendar display options"
            @click="openPanel('Booking options')"
          >
            <AppIcon name="filters" :size="17" /></button
          ><RouterLink class="checkin-button" to="/pos/bookings/create?type=walk_in">
            <AppIcon name="users" :size="15" />Create walk-in</RouterLink
          ><RouterLink class="primary" to="/pos/bookings/create?type=reservation">
            <AppIcon name="add" :size="16" />Create booking
          </RouterLink>
        </div>
      </div>
      <div class="calendar-controls">
        <div class="date-controls">
          <AppIcon name="calendar" :size="16" /><strong>{{ rangeLabel }}</strong
          ><button class="icon-button" aria-label="Previous dates" @click="shift(-7)">
            <AppIcon name="chevronLeft" :size="16" /></button
          ><button class="icon-button" aria-label="Next dates" @click="shift(7)">
            <AppIcon name="chevronRight" :size="16" /></button
          ><button @click="showToday">Today</button>
        </div>
        <div class="legend">
          <span
            >Daily category availability · Booking bars include arrival and departure dates</span
          >
        </div>
      </div>
      <p class="selection-hint" role="status">
        {{
          selectionAnchor
            ? 'Single day loaded. Choose another date to extend the range, or the same date to finish.'
            : 'Choose a date for one day, then a second date for a range.'
        }}
      </p>
      <nav class="date-strip years" aria-label="Select year">
        <span class="strip-label">Year</span
        ><button
          v-for="year in years"
          :key="year"
          :aria-pressed="calendarMonth.getFullYear() === year"
          :class="{ active: calendarMonth.getFullYear() === year }"
          @click="selectYear(year)"
        >
          {{ year }}
        </button>
      </nav>
      <nav class="date-strip" aria-label="Select month">
        <span class="strip-label">Month</span
        ><button
          v-for="(month, index) in months"
          :key="month"
          :aria-pressed="calendarMonth.getMonth() === index"
          :class="{ active: calendarMonth.getMonth() === index }"
          @click="selectMonth(index)"
        >
          {{ month }}
        </button>
      </nav>
      <p v-if="loading" role="status" class="notice">Loading booking dashboard...</p>
      <div v-else-if="loadError" role="alert" class="notice">
        <p>{{ loadError }}</p>
        <button type="button" @click="loadRooms">Try again</button>
      </div>
      <div
        v-else
        ref="calendarScroll"
        class="calendar-scroll"
        tabindex="0"
        aria-label="Scrollable room schedule"
      >
        <div
          class="schedule"
          :style="{
            '--day-count': Math.max(1, dayCount),
            minWidth: `${180 + Math.max(1, dayCount) * 64}px`,
          }"
        >
          <div class="schedule-header">
            <div class="room-label">
              Rooms <span>{{ visibleGroups.reduce((total, g) => total + g.rooms.length, 0) }}</span>
            </div>
            <div class="days">
              <button
                v-for="day in days"
                :key="dateKey(day)"
                class="day"
                type="button"
                :aria-label="`Select ${dateKey(day)}`"
                :aria-pressed="selectedDay(day)"
                @click="selectDay(day)"
                :class="{
                  selected: selectedDay(day),
                  today: dateKey(day) === dateKey(today),
                  weekend: day.getDay() === 0 || day.getDay() === 6,
                }"
              >
                <span>{{ day.toLocaleDateString('en', { weekday: 'short' }) }}</span
                ><strong>{{ day.getDate() }}</strong
                ><small>{{ day.toLocaleDateString('en', { month: 'short' }) }}</small>
              </button>
            </div>
          </div>
          <section v-for="group in visibleGroups" :key="group.id" :aria-label="group.name">
            <div class="group-row">
              <button
                class="group-label"
                :aria-expanded="!collapsed.includes(group.id)"
                @click="toggleGroup(group.id)"
              >
                <AppIcon name="rooms" :size="14" /><span
                  >{{ group.name }}<small>{{ group.description }}</small></span
                ><AppIcon
                  :name="collapsed.includes(group.id) ? 'chevronRight' : 'chevronDown'"
                  :size="14"
                />
              </button>
              <div class="availability">
                <div v-for="day in days" :key="dateKey(day)">
                  <span
                    :class="{ soldout: available(group, day) === 0 }"
                    :title="availabilityTitle(group, day)"
                    >{{ available(group, day) ?? '-' }}</span
                  >
                </div>
              </div>
            </div>
            <div
              v-for="room in collapsed.includes(group.id) ? [] : group.rooms"
              :key="room.id"
              class="room-row"
            >
              <button
                class="room-number"
                :aria-label="`View ${room.name}: ${room.status}`"
                @click="selectedRoomId = room.id"
              >
                <i
                  :class="room.status"
                  :style="{ backgroundColor: statusStyle(room.status).color }"
                  :title="statusLabel(room.status)"
                /><span>{{ room.name }}</span
                ><AppIcon name="more" :size="15" />
              </button>
              <div class="room-timeline" :style="{ minHeight: timelineHeight(room) }">
                <div class="grid-lines" aria-hidden="true">
                  <span
                    v-for="day in days"
                    :key="dateKey(day)"
                    :class="{ weekend: day.getDay() === 0 || day.getDay() === 6 }"
                  />
                </div>
                <button
                  v-for="bar in bookingBars(room)"
                  :key="bar.key"
                  class="booking"
                  :style="bar.style"
                  type="button"
                  @click="selectedRoomId = room.id"
                  :aria-label="`View ${room.name} for ${bar.booking.guestName}`"
                  :title="`${bar.booking.guestName} · ${statusLabel(bar.booking.status)} · ${bar.booking.start_date_time} to ${bar.booking.end_date_time} · ${bar.booking.totalGuests} guest(s)`"
                >
                  {{ bar.booking.guestName }} · {{ bar.booking.totalGuests }} guest(s)
                </button>
              </div>
            </div>
          </section>
          <p v-if="!visibleGroups.length" class="empty">
            No rooms found. Try changing your room search or filters.
          </p>
        </div>
      </div>
      <footer class="calendar-footer">
        <span><i class="live-dot" /> {{ visibleGroups.length }} room types shown</span
        ><span>Current room status - Select a room for details</span>
      </footer>
    </section>
    <dialog
      ref="dialog"
      class="pos-dialog"
      aria-labelledby="panel-title"
      @cancel.prevent="closePanel"
    >
      <header>
        <div>
          <span class="eyebrow">FRONT DESK</span>
          <h2 id="panel-title">{{ panel }}</h2>
        </div>
        <button class="icon-button" aria-label="Close dialog" @click="closePanel">
          <AppIcon name="close" />
        </button>
      </header>
      <template v-if="panel === 'Room types'"
        ><label class="field"
          >Show room type<select v-model="typeFilter">
            <option value="all">All room types</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">
              {{ group.name }}
            </option>
          </select></label
        ><button class="primary" @click="closePanel">Apply</button></template
      >
      <template v-else-if="panel === 'Booking options'"
        ><button @click="setAllGroups(false)">Expand all room types</button
        ><button @click="setAllGroups(true)">Collapse all room types</button></template
      >
      <template v-else-if="panel === 'Housekeeping'"
        ><p class="muted">Current room readiness</p>
        <div v-for="group in groups" :key="group.id" class="readiness">
          <h3>{{ group.name }}</h3>
          <div v-for="room in group.rooms" :key="room.id">
            <span>{{ room.name }}</span
            ><span class="state" :style="statusStyle(room.status)">{{
              statusLabel(room.status)
            }}</span>
          </div>
        </div></template
      >
      <template v-else-if="panel === 'Facilities'"
        ><p class="muted">Sample property facilities</p>
        <ul class="facilities">
          <li>Restaurant &amp; room service</li>
          <li>Wi-Fi throughout the property</li>
          <li>Guest parking</li>
          <li>Laundry service</li>
        </ul></template
      >
      <p v-else-if="panel === 'Create booking' || panel === 'Create check-in'" class="muted">
        Booking and check-in are not available yet.
      </p>
    </dialog>
    <RoomDrawer
      @updated="loadRooms"
      v-if="selectedRoomId != null"
      :room-id="selectedRoomId"
      @close="selectedRoomId = null"
    />
  </main>
</template>
<style scoped>
.selection-hint {
  margin: 0;
  padding: 8px 20px;
  color: #526680;
  background: #f5faff;
}
.day.selected {
  background: #e0f3ff;
  color: #075985;
  box-shadow: inset 0 -3px #0ea5e9;
}
button.day {
  display: block;
  border: 0;
  border-radius: 0;
  border-right: 1px solid #f0f3f8;
  background: transparent;
}
button.day:hover {
  background: #edf7ff;
}
button.day.selected {
  background: #e0f3ff;
  color: #075985;
}
button.day:focus-visible {
  outline: 2px solid #0284c7;
  outline-offset: -2px;
}
a.booking {
  text-decoration: none;
  line-height: 31px;
  box-sizing: border-box;
}

.booking-tools a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  border: 1px solid #dce5ec;
  border-radius: 5px;
  text-decoration: none;
  font-size: 12px;
}
.pos-shell {
  min-height: 100dvh;
  padding: 28px;
  background: #f6f8fc;
  color: #42536e;
  font-family: Inter, system-ui, sans-serif;
  font-size: 12px;
}
.workspace-heading,
.brand,
.staff,
.toolbar,
.booking-tools,
.workspace-tools,
.date-controls,
.calendar-controls,
.legend,
.legend span,
.calendar-footer {
  display: flex;
  align-items: center;
}
.workspace-heading {
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
}
.brand {
  gap: 12px;
}
.brand-mark {
  font-family: Georgia, serif;
  font-size: 23px;
  background: #16364a;
  color: #e7d4ae;
  border-radius: 11px;
  padding: 12px;
}
.eyebrow {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.8px;
  color: #8c9aaf;
}
h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 4px 0 0;
  letter-spacing: -0.5px;
}
.staff {
  gap: 10px;
}
.staff small {
  display: block;
  font-size: 10px;
  color: #94a3b8;
  margin-top: 3px;
}
.staff-avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  background: #e8eef5;
  border-radius: 50%;
  color: #64748b;
}
.demo-badge {
  padding: 5px 9px;
  border: 1px solid #dce5ef;
  border-radius: 20px;
  font-size: 10px;
  color: #7b8ba1;
  margin-right: 10px;
}
.calendar-card {
  background: #fff;
  border: 1px solid #dfe6ef;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 3px 14px #233f5d04;
  min-height: calc(100dvh - 122px);
  display: flex;
  flex-direction: column;
}
button,
input,
select {
  font: inherit;
}
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #fff;
  border: 1px solid #e1e8f0;
  padding: 8px 10px;
  border-radius: 4px;
  color: #53637c;
  cursor: pointer;
  white-space: nowrap;
}
button:hover {
  background: #f1f8fc;
  border-color: #a9d8ed;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
.calendar-scroll:focus-visible {
  outline: 2px solid #0ba8dc;
  outline-offset: 2px;
}
.toolbar {
  padding: 16px;
  gap: 18px;
  flex-wrap: wrap;
  border-bottom: 1px solid #eaf0f6;
}
.workspace-tools {
  gap: 7px;
}
.workspace-tools button {
  font-size: 10px;
  min-height: 32px;
}
.booking-tools {
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid #dfe7f0;
  height: 33px;
  border-radius: 4px;
  color: #8b9bb1;
}
.search input {
  border: 0;
  outline-offset: 4px;
  width: 210px;
  min-width: 0;
  color: #53637c;
  font-size: 10px;
}
.search input::placeholder {
  color: #9ba9bc;
}
.primary {
  background: #1aafe0;
  border-color: #1aafe0;
  color: white;
}
.primary:hover {
  background: #099bcf;
  color: white;
}
.icon-button {
  padding: 7px;
}
.checkin-button {
  color: #507493;
}
.calendar-controls {
  padding: 13px 16px;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.date-controls {
  gap: 8px;
}
.date-controls strong {
  font-size: 11px;
  font-weight: 500;
  margin-right: 8px;
}
.date-controls button {
  border-color: #edf1f7;
  font-size: 10px;
  padding: 5px 7px;
}
.legend {
  gap: 16px;
  font-size: 10px;
  color: #8c9bb0;
}
.legend span {
  gap: 5px;
}
.legend i,
.room-number i {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 1px;
}
.legend .confirmed {
  background: #49bff0;
}
.legend .checked-in {
  background: #4ed386;
}
.legend .pending {
  background: #edb965;
}
.date-strip {
  display: grid;
  grid-template-columns: 150px repeat(12, minmax(48px, 1fr));
  align-items: center;
  border-top: 1px solid #eaf0f6;
  padding: 6px 12px;
  overflow-x: auto;
}
.date-strip.years {
  grid-template-columns: 150px repeat(9, minmax(48px, 1fr));
}
.strip-label {
  color: #a3afbf;
  font-size: 10px;
  padding-left: 5px;
}
.date-strip button {
  border: none;
  justify-self: center;
  font-size: 10px;
  padding: 4px 8px;
  color: #7b8ca5;
}
.date-strip button.active {
  background: #18b0e1;
  color: white;
  border-radius: 3px;
}
.calendar-scroll {
  overflow-x: auto;
  flex: 1;
  border-top: 1px solid #e4ebf3;
}
.schedule {
  min-width: 1080px;
}
.schedule-header,
.group-row,
.room-row {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
}
.schedule-header {
  border-bottom: 1px solid #e5edf5;
}
/* Keep room identifiers visible above the scrolling booking timeline. */
.room-label,
.group-label,
.room-number {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
  box-shadow: 3px 0 5px #263b510a;
}
.room-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  font-weight: 600;
  border-right: 1px solid #e6edf5;
}
.room-label span {
  background: #f0f4f8;
  color: #98a7ba;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}
.days,
.availability,
.grid-lines {
  display: grid;
  grid-template-columns: repeat(var(--day-count), minmax(0, 1fr));
}
.day {
  text-align: center;
  padding: 8px 0;
  color: #8090a7;
  font-size: 10px;
  border-right: 1px solid #f0f3f8;
}
.day strong {
  display: block;
  font-size: 12px;
  font-weight: 500;
  margin: 3px 0;
}
.day small {
  font-size: 8px;
  color: #a3afbf;
}
.day.today {
  background: #52617b;
  color: white;
}
.day.today small {
  color: #d3dfef;
}
.weekend {
  background: #fafbfe;
}
.group-row {
  min-height: 45px;
  border-block: 1px solid #e5edf5;
  background: #fcfdff;
}
.group-label {
  background: #fcfdff;
  border: 0;
  border-right: 1px solid #e5edf5;
  border-radius: 0;
  justify-content: flex-start;
  text-align: left;
  padding: 10px 13px;
  font-size: 11px;
}
.group-label > .app-icon:first-child {
  color: #99a9bf;
}
.group-label > .app-icon:last-child {
  margin-left: auto;
  color: #6bbbd8;
}
.group-label small {
  display: block;
  color: #94a3b8;
  font-size: 9px;
  font-weight: 400;
  margin-top: 3px;
}
.availability > div {
  display: grid;
  place-items: center;
  border-right: 1px solid #f0f4f9;
}
.availability span {
  background: #4bd784;
  color: #fff;
  font-size: 9px;
  line-height: 15px;
  min-width: 19px;
  text-align: center;
  border-radius: 3px;
}
.availability span.soldout {
  background: #fa787e;
}
.room-row {
  min-height: 44px;
}
.room-number {
  border: 0;
  border-right: 1px solid #e6edf5;
  border-radius: 0;
  justify-content: flex-start;
  padding: 0 16px;
  font-size: 11px;
  color: #7e8da7;
}
.room-number .app-icon {
  margin-left: auto;
  color: #b0bfd0;
}
.room-number i {
  background: #b9c7e6;
}
.room-number i.available {
  background: #5bda89;
}
.room-number i.cleaning {
  background: #25b9e8;
}
.room-number i.maintenance {
  background: #f18588;
}
.room-timeline {
  position: relative;
}
.grid-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.grid-lines span {
  border-right: 1px solid #f0f3f8;
}
.booking {
  position: absolute;
  top: 5px;
  height: 31px;
  padding: 0 9px;
  border: 0;
  border-left: 3px solid #1ab6f0;
  border-radius: 1px;
  color: #198fc2;
  background: #e0f3ff;
  text-align: left;
  justify-content: flex-start;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  white-space: nowrap;
}
.booking:hover {
  filter: brightness(0.97);
  background: #d5edfc;
}
.booking.checked-in {
  background: #ddfbea;
  border-color: #46d479;
  color: #27a45b;
}
.booking.pending {
  background: #fff0d7;
  border-color: #f2b65e;
  color: #d79328;
}
.booking.cancelled {
  background: #f1f2f5;
  color: #9ca3af;
  border-color: #9ca3af;
  text-decoration: line-through;
}
.empty {
  padding: 60px;
  text-align: center;
  color: #8d9bb0;
}
.calendar-footer {
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  color: #9aa7b9;
  font-size: 10px;
  border-top: 1px solid #edf1f6;
  margin-top: 70px;
}
.live-dot {
  display: inline-block;
  height: 5px;
  width: 5px;
  border-radius: 50%;
  background: #4bd784;
  margin-right: 5px;
}
.notice {
  margin: 0;
  padding: 10px 16px;
  color: #54705e;
  background: #effbf4;
  font-size: 11px;
}
.pos-dialog {
  width: min(460px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  overflow: auto;
  border: 1px solid #dfe7ef;
  border-radius: 12px;
  padding: 24px;
  color: #42536e;
  box-shadow: 0 24px 80px #173a5630;
}
.pos-dialog::backdrop {
  background: #18334855;
}
.pos-dialog header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.pos-dialog h2 {
  margin: 5px 0 0;
  font-size: 19px;
}
.pos-dialog dt {
  font-size: 11px;
  color: #8d9bb0;
  margin-top: 14px;
}
.pos-dialog dd {
  margin: 5px 0 0;
  font-size: 14px;
}
.field {
  display: grid;
  gap: 7px;
  font-size: 12px;
  margin-bottom: 15px;
}
.field input,
.field select {
  width: 100%;
  min-width: 0;
  border: 1px solid #dce5ef;
  border-radius: 5px;
  padding: 9px;
  color: #42536e;
  background: white;
}
.date-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.muted {
  color: #8c9bb0;
  font-size: 12px;
  line-height: 1.6;
}
.form-error {
  color: #b91c1c;
  font-size: 12px;
}
.check {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 13px;
}
.readiness h3 {
  font-size: 12px;
  margin: 20px 0 8px;
}
.readiness > div {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #edf1f7;
  padding: 9px 0;
  font-size: 12px;
}
.state {
  text-transform: capitalize;
  color: #8395ac;
}
.facilities {
  line-height: 2.5;
  font-size: 13px;
  padding-left: 18px;
}
@media (min-width: 1600px) {
  .pos-shell {
    padding: 36px 48px;
  }
  .room-row {
    min-height: 48px;
  }
  .booking {
    top: 7px;
    height: 34px;
  }
}
@media (max-width: 800px) {
  .pos-shell {
    padding: 12px;
  }
  .workspace-heading {
    margin: 8px 0 18px;
  }
  .staff > span:last-child {
    display: none;
  }
  h1 {
    font-size: 16px;
  }
  .brand-mark {
    padding: 9px;
  }
  .toolbar {
    padding: 12px;
  }
  .workspace-tools {
    flex-wrap: wrap;
  }
  .booking-tools {
    margin-left: 0;
    width: 100%;
  }
  .search {
    flex: 1 1 200px;
  }
  .search input {
    width: 100%;
  }
  .date-strip,
  .date-strip.years {
    grid-template-columns: 60px repeat(12, 48px);
  }
  .date-strip.years {
    grid-template-columns: 60px repeat(9, 48px);
  }
  .calendar-footer {
    flex-wrap: wrap;
  }
  .demo-badge {
    margin-right: 0;
  }
}
.available-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
}
.current-booking {
  position: relative;
  margin: 6px;
  font-size: 10px;
  background: #e0f3ff;
  color: #198fc2;
}
</style>
