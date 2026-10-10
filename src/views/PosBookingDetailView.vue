<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { posBookingService } from '@/services/pos-booking.service'
import type { PosBookingDetail } from '@/types/pos-booking'
import { statusLabel, statusStyle } from '@/constants/hotel-status'
import { toApiError } from '@/services/api/api-error'
const route = useRoute()
const booking = ref<PosBookingDetail | null>(null)
const loading = ref(false)
const error = ref('')
let controller: AbortController | undefined
let disposed = false
async function load() {
  controller?.abort()
  booking.value = null
  error.value = ''
  const active = new AbortController()
  controller = active
  const raw = String(route.params.id || '')
  const id = Number(raw)
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) {
    error.value = 'Invalid booking ID.'
    loading.value = false
    return
  }
  loading.value = true
  try {
    const result = await posBookingService.get(id, active.signal)
    if (!disposed && !active.signal.aborted) booking.value = result
  } catch (cause) {
    if (!disposed && !active.signal.aborted) error.value = toApiError(cause).message
  } finally {
    if (!disposed && !active.signal.aborted) loading.value = false
  }
}
watch(() => route.params.id, load, { immediate: true })
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
})
const groups = computed(() => {
  const b = booking.value
  if (!b) return []
  return [
    {
      title: 'Guest & booking',
      fields: [
        ['Booking ID', b.id],
        ['Guest name', b.guest_name],
        ['Phone', b.guest_phone],
        ['Email', b.guest_email],
        ['Guests', b.guest_count],
        ['Booking type', statusLabel(b.booking_type)],
        ['Charge type', statusLabel(b.charge_type)],
      ],
    },
    {
      title: 'Stay',
      fields: [
        ['Expected check-in', b.expected_check_in_at],
        ['Expected check-out', b.expected_check_out_at],
        ['Checked in', b.checked_in_at],
        ['Checked out', b.checked_out_at],
        ['Session hours', b.session_hours],
      ],
    },
    {
      title: 'Room',
      fields: [
        ['Room ID', b.room_id],
        ['Name', b.room?.name],
        ['Category', b.room?.room_category?.name],
        ['Category description', b.room?.room_category?.description],
        ['Current room status', b.room?.status ? statusLabel(b.room.status) : null],
        ['Current room price', b.room?.price],
        ['Room updated', b.room?.updated_at],
      ],
    },
    {
      title: 'Charges',
      fields: [
        ['Room rate', b.room_rate],
        ['Session rate', b.session_rate],
        ['Subtotal', b.subtotal],
        ['Discount', b.discount_amount],
        ['Tax', b.tax_amount],
        ['Total', b.total_amount],
        ['Paid', b.paid_amount],
        ['Balance', b.balance_amount],
      ],
    },
    {
      title: 'Record information',
      fields: [
        ['Created by', b.created_by],
        ['Updated by', b.updated_by],
        ['Checked in by', b.checked_in_by],
        ['Checked out by', b.checked_out_by],
        ['Created at', b.created_at],
        ['Updated at', b.updated_at],
      ],
    },
  ]
})
</script>
<template>
  <main class="booking-detail">
    <RouterLink to="/pos/bookings">Back to bookings</RouterLink>
    <p v-if="loading" role="status">Loading booking details…</p>
    <div v-else-if="error" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">Retry</button>
    </div>
    <template v-else-if="booking"
      ><header>
        <div>
          <small>BOOKING DETAILS</small>
          <h1>{{ booking.booking_no }}</h1>
          <p>{{ booking.guest_name }} · {{ booking.room?.name || `Room #${booking.room_id}` }}</p>
        </div>
        <span class="badge" :style="statusStyle(booking.status)">{{
          statusLabel(booking.status)
        }}</span>
      </header>
      <div class="detail-grid">
        <section v-for="group in groups" :key="group.title">
          <h2>{{ group.title }}</h2>
          <dl>
            <template v-for="[label, value] in group.fields" :key="String(label)"
              ><dt>{{ label }}</dt>
              <dd>{{ value ?? '—' }}</dd></template
            >
          </dl>
        </section>
        <section>
          <h2>Booking note</h2>
          <p class="note">{{ booking.note || 'No note.' }}</p>
        </section>
      </div>
      <section class="payments">
        <h2>Payments</h2>
        <p v-if="!booking.payments?.length">No payments recorded.</p>
        <div v-else class="table-scroll">
          <table>
            <caption>
              Payments for
              {{
                booking.booking_no
              }}
            </caption>
            <thead>
              <tr>
                <th>Payment</th>
                <th>Type</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Paid at</th>
                <th>Note</th>
                <th>Created by</th>
                <th>Created at</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in booking.payments" :key="payment.id">
                <td>
                  {{ payment.payment_no }}<small>ID {{ payment.id }}</small>
                </td>
                <td>{{ statusLabel(payment.payment_type) }}</td>
                <td>{{ statusLabel(payment.payment_method) }}</td>
                <td>{{ payment.amount }}</td>
                <td>{{ payment.paid_at }}</td>
                <td>{{ payment.note || '—' }}</td>
                <td>{{ payment.created_by ?? '—' }}</td>
                <td>{{ payment.created_at }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>
<style scoped>
.booking-detail {
  padding: 28px;
  background: #f4f7fa;
  color: #263b51;
  min-height: calc(100dvh - 60px);
}
a {
  color: #036985;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24px 0;
  gap: 16px;
}
h1 {
  margin: 8px 0;
  font-size: 25px;
  overflow-wrap: anywhere;
}
h2 {
  font-size: 16px;
  margin-top: 0;
}
small {
  color: #64748b;
  font-size: 11px;
}
.badge {
  padding: 7px 12px;
  border-radius: 20px;
  white-space: nowrap;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
section {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 22px;
  background: white;
}
dl {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 14px;
  font-size: 13px;
}
dt {
  color: #64748b;
}
dd {
  margin: 0;
  text-align: right;
  overflow-wrap: anywhere;
}
.note {
  white-space: pre-wrap;
}
.payments {
  margin-top: 18px;
}
.table-scroll {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
th,
td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}
th {
  white-space: nowrap;
  background: #f8fafc;
}
td small {
  display: block;
}
caption {
  text-align: left;
  padding-bottom: 12px;
  color: #64748b;
}
button {
  padding: 10px 16px;
  cursor: pointer;
}
@media (max-width: 700px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .booking-detail {
    padding: 16px;
  }
  header {
    align-items: start;
    flex-direction: column;
  }
}
</style>
