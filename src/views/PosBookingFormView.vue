<script setup lang="ts">
import { statusLabel, statusStyle } from '@/constants/hotel-status'
import { computed, watch, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, RouterLink } from 'vue-router'
import { ValidationError } from 'yup'
import AppIcon from '@/components/common/AppIcon.vue'
import { posCashbookService, type PosCashbook } from '@/services/pos-cashbook.service'
import { posRoomService } from '@/services/pos-room.service'
import { posBookingService, type PosBooking } from '@/services/pos-booking.service'
import { bookingPayload } from '@/schemas/pos-booking.schema'
import { toApiError } from '@/services/api/api-error'
import type { PosRoom } from '@/types/pos-room'
const route = useRoute()
const form = reactive({
  room_id: '',
  booking_type: route.query.type === 'walk_in' ? 'walk_in' : 'reservation',
  guest_name: '',
  charge_type: 'day',
  expected_check_in_at: '',
  expected_check_out_at: '',
  session_hours: '',
  session_rate: '',
  note: '',
  include_deposit: false,
  deposit: { cashbook_id: '', amount: '', payment_method: 'cash', paid_at: '', note: '' },
})
const rooms = ref<PosRoom[]>([])
const loading = ref(false)
const loadError = ref('')
const error = ref('')
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const saved = ref<PosBooking | null>(null)
let loadController: AbortController | undefined
const saveController = new AbortController()
let disposed = false
const needsDeposit = computed(() => form.booking_type === 'reservation' && form.include_deposit)
const cashbooks = ref<PosCashbook[]>([])
const cashbooksLoading = ref(false)
const cashbookError = ref('')
async function loadCashbooks() {
  if (cashbooksLoading.value) return
  cashbooksLoading.value = true
  cashbookError.value = ''
  try {
    const result = await posCashbookService.list(saveController.signal)
    if (!disposed) cashbooks.value = result
  } catch (cause) {
    if (!disposed) cashbookError.value = toApiError(cause).message
  } finally {
    if (!disposed) cashbooksLoading.value = false
  }
}
watch(needsDeposit, (needed) => {
  if (needed) void loadCashbooks()
})

async function loadRooms() {
  loadController?.abort()
  const active = new AbortController()
  loadController = active
  loading.value = true
  loadError.value = ''
  try {
    const result = await posRoomService.list(active.signal)
    if (!disposed && !active.signal.aborted) rooms.value = result
  } catch (cause) {
    if (!disposed && !active.signal.aborted) loadError.value = toApiError(cause).message
  } finally {
    if (!disposed && !active.signal.aborted) loading.value = false
  }
}
onMounted(loadRooms)
onBeforeUnmount(() => {
  disposed = true
  loadController?.abort()
  saveController.abort()
})
onBeforeRouteLeave(() => !saving.value)
async function submit() {
  if (saving.value || saved.value || loading.value || loadError.value) return
  if (needsDeposit.value && (cashbooksLoading.value || cashbookError.value)) return
  saving.value = true
  error.value = ''
  errors.value = {}
  try {
    const payload = await bookingPayload(form)
    if (
      payload.deposit &&
      !cashbooks.value.some((cashbook) => cashbook.id === payload.deposit?.cashbook_id)
    )
      throw new Error('Choose a deposit cashbook from the list.')
    if (!rooms.value.some((room) => room.id === payload.room_id)) {
      errors.value.room_id = 'Choose a room.'
      return
    }
    if (disposed) return
    const result = await posBookingService.create(payload, saveController.signal)
    if (!disposed) saved.value = result
  } catch (cause) {
    if (disposed) return
    if (cause instanceof ValidationError) {
      for (const issue of cause.inner)
        if (issue.path && !errors.value[issue.path]) errors.value[issue.path] = issue.message
    } else {
      const apiError = toApiError(cause)
      error.value = apiError.message
      const details = apiError.details as { errors?: Record<string, string[]> } | undefined
      if (details?.errors)
        for (const [key, messages] of Object.entries(details.errors))
          if (Array.isArray(messages) && messages[0]) errors.value[key] = messages[0]
    }
  } finally {
    if (!disposed) saving.value = false
  }
}
</script>
<template>
  <main class="booking-page">
    <header>
      <div>
        <span class="eyebrow">SHWE PETIT · FRONT DESK</span>
        <h1>Create booking</h1>
        <p>Reserve a room or register a walk-in stay.</p>
      </div>
      <RouterLink v-if="!saving" to="/pos">Back to calendar</RouterLink>
    </header>
    <section v-if="saved" class="card success" role="status">
      <AppIcon name="status" :size="32" />
      <h2>Booking saved</h2>
      <strong>{{ saved.booking_no }}</strong>
      <p>{{ saved.guest_name }} · {{ saved.status }}</p>
      <dl>
        <dt>Total</dt>
        <dd>{{ saved.total_amount }}</dd>
        <dt>Paid</dt>
        <dd>{{ saved.paid_amount }}</dd>
        <dt>Balance</dt>
        <dd>{{ saved.balance_amount }}</dd>
      </dl>
      <RouterLink class="primary" to="/pos">Return to calendar</RouterLink>
    </section>
    <form v-else novalidate :aria-busy="saving" @submit.prevent="submit">
      <p v-if="loadError" role="alert" class="error">
        {{ loadError }} <button type="button" @click="loadRooms">Retry rooms</button>
      </p>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <ul v-if="Object.keys(errors).length" class="error" role="alert">
        <li v-for="(message, key) in errors" :key="key">{{ message }}</li>
      </ul>
      <fieldset :disabled="saving" class="card">
        <legend>Stay details</legend>
        <div class="fields">
          <label
            >Booking type<select v-model="form.booking_type" name="booking_type">
              <option value="reservation">Reservation</option>
              <option value="walk_in">Walk-in</option>
            </select></label
          >
          <label
            >Room<select
              v-model="form.room_id"
              name="room_id"
              :disabled="loading || !!loadError"
              :aria-invalid="!!errors.room_id"
            >
              <option value="">{{ loading ? 'Loading rooms…' : 'Select a room' }}</option>
              <option v-for="room in rooms" :key="room.id" :value="room.id">
                {{ room.name }} · {{ room.room_category?.name }} · {{ room.price }}
              </option></select
            ><small v-if="!loading && !loadError && !rooms.length">No rooms found.</small></label
          >
          <label
            >Guest name<input
              v-model="form.guest_name"
              name="guest_name"
              autocomplete="name"
              :aria-invalid="!!errors.guest_name"
          /></label>
          <label
            >Charge type<select v-model="form.charge_type" name="charge_type">
              <option value="day">Day</option>
              <option value="session">Session</option>
            </select></label
          >
          <label
            >Expected check-in<input
              v-model="form.expected_check_in_at"
              name="expected_check_in_at"
              type="datetime-local"
              step="1"
              :aria-invalid="!!errors.expected_check_in_at"
          /></label>
          <label
            >Expected check-out<input
              v-model="form.expected_check_out_at"
              name="expected_check_out_at"
              type="datetime-local"
              step="1"
              :aria-invalid="!!errors.expected_check_out_at"
          /></label>
          <template v-if="form.charge_type === 'session'"
            ><label
              >Session hours<input
                v-model="form.session_hours"
                name="session_hours"
                type="number"
                min="0"
                step="any"
                :aria-invalid="!!errors.session_hours" /></label
            ><label
              >Session rate<input
                v-model="form.session_rate"
                name="session_rate"
                type="number"
                min="0"
                step="any"
                :aria-invalid="!!errors.session_rate" /></label
          ></template>
          <label class="wide">Note<textarea v-model="form.note" name="note" rows="3" /></label>
        </div>
      </fieldset>
      <fieldset v-if="form.booking_type === 'reservation'" :disabled="saving" class="card">
        <legend>Reservation deposit</legend>
        <label class="check"
          ><input v-model="form.include_deposit" type="checkbox" name="include_deposit" /> Add a
          deposit (optional)</label
        >
        <div v-if="form.include_deposit" class="fields deposit">
          <label
            >Deposit cashbook<select
              v-model="form.deposit.cashbook_id"
              name="deposit.cashbook_id"
              :disabled="cashbooksLoading"
              required
            >
              <option value="">
                {{ cashbooksLoading ? 'Loading cashbooks…' : 'Choose a cashbook' }}
              </option>
              <option v-for="cashbook in cashbooks" :key="cashbook.id" :value="cashbook.id">
                {{ cashbook.name }} ({{ cashbook.code }})
              </option>
            </select></label
          >
          <p v-if="cashbookError" role="alert" class="error">
            {{ cashbookError }}
            <button type="button" @click="loadCashbooks">Retry cashbooks</button>
          </p>
          <p v-else-if="!cashbooksLoading && !cashbooks.length">No cashbooks found.</p>
          <label
            >Deposit amount<input
              v-model="form.deposit.amount"
              name="deposit.amount"
              type="number"
              min="0"
              step="any"
          /></label>
          <label
            >Payment method<select
              v-model="form.deposit.payment_method"
              name="deposit.payment_method"
            >
              <option value="cash">Cash</option>
              <option value="kpay">KPay</option>
              <option value="wavepay">WavePay</option>
              <option value="ayapay">AyaPay</option>
            </select></label
          >
          <label
            >Paid at<input
              v-model="form.deposit.paid_at"
              name="deposit.paid_at"
              type="datetime-local"
              step="1"
          /></label>
          <label>Deposit note<input v-model="form.deposit.note" name="deposit.note" /></label>
        </div>
      </fieldset>
      <footer>
        <RouterLink v-if="!saving" to="/pos">Cancel</RouterLink
        ><button
          class="primary"
          type="submit"
          :disabled="saving || loading || !!loadError || !rooms.length"
        >
          <AppIcon name="add" :size="17" />{{ saving ? 'Saving booking…' : 'Create booking' }}
        </button>
      </footer>
    </form>
  </main>
</template>
<style scoped>
.booking-page {
  min-height: 100dvh;
  background: #f3f7fa;
  padding: 32px max(20px, calc((100vw - 1000px) / 2));
  color: #263b51;
}
header,
footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}
h1 {
  margin: 6px 0;
  font-size: 28px;
}
p {
  color: #60758b;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 2px;
  color: #1786a8;
  font-weight: 700;
}
a {
  color: #137eaa;
  text-decoration: none;
}
.card {
  min-width: 0;
  padding: 26px;
  border: 1px solid #dde7ee;
  background: white;
  border-radius: 14px;
  margin: 0 0 24px;
  box-shadow: 0 4px 18px #203a5010;
}
legend {
  font-weight: 700;
  padding: 0 8px;
}
.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}
input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid #d3dfe8;
  border-radius: 7px;
  font: inherit;
  background: white;
  color: inherit;
}
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid #39b7d4;
  outline-offset: 2px;
}
[aria-invalid='true'] {
  border-color: #bf3347;
}
.wide {
  grid-column: 1/-1;
}
.check {
  flex-direction: row;
  align-items: center;
}
.check input {
  width: 18px;
  height: 18px;
}
.deposit {
  margin-top: 22px;
}
.error {
  color: #ac293c;
  background: #fff0f2;
  padding: 16px 30px;
  border-radius: 8px;
}
.primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #159ec5;
  color: white;
  padding: 12px 20px;
  border: 0;
  border-radius: 8px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
button:disabled {
  opacity: 0.55;
  cursor: wait;
}
.success {
  text-align: center;
}
dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  max-width: 350px;
  margin: 24px auto;
  text-align: left;
}
dd {
  text-align: right;
  margin: 0;
}
@media (max-width: 640px) {
  .fields {
    grid-template-columns: 1fr;
  }
  header {
    align-items: start;
    flex-direction: column;
  }
  .card {
    padding: 18px;
  }
}
</style>
