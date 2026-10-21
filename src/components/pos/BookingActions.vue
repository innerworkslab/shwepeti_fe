<script setup lang="ts">
import { computed, watch, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { calculatePosCharges } from '@/utils/pos-charges'
import { checkoutPaymentSchema } from '@/schemas/pos-payment.schema'
import { ValidationError } from 'yup'
import { posCashbookService, type PosCashbook } from '@/services/pos-cashbook.service'
import { posBookingService } from '@/services/pos-booking.service'
import {
  partialPaymentSchema,
  type PartialPaymentInput,
  bookingPaymentMethods,
  bookingPaymentSchema,
} from '@/schemas/pos-payment.schema'
import type { PosBookingDetail } from '@/types/pos-booking'
import { toApiError } from '@/services/api/api-error'
const props = defineProps<{
  bookingId: number
  disabled: boolean
  refreshKey?: number
  roomBooking?: Record<string, unknown> | null
}>()
const emit = defineEmits<{ busy: [value: boolean]; saved: [] }>()
const booking = ref<PosBookingDetail | null>(null)
// Prefer the detailed booking invoice; retain room snapshots for older API responses.
const invoice = computed(() => {
  if (!booking.value) return null
  const result = { ...booking.value }
  if (
    booking.value.grand_total_amount == null &&
    Number(props.roomBooking?.id) === props.bookingId
  ) {
    for (const key of [
      'subtotal',
      'discount_amount',
      'tax_amount',
      'tax_percentage',
      'service_charge_amount',
      'service_charge_percentage',
      'total_amount',
      'paid_amount',
      'balance_amount',
    ] as const) {
      const value = props.roomBooking?.[key]
      if (
        ((typeof value === 'string' && value.trim() !== '') || typeof value === 'number') &&
        Number.isFinite(Number(value))
      )
        Object.assign(result, { [key]: value })
    }
  }
  return result
})
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const mode = ref<'partial' | 'checkout' | null>(null)
const recordedPayment = ref<PartialPaymentInput | null>(null)
const form = reactive({
  tax_percentage: 0,
  service_charge_percentage: 0,
  cashbook_id: '' as string | number,
  payment_method: 'cash',
  amount: '' as string | number,
  paid_at: '',
  note: '',
})
const charges = computed(() =>
  calculatePosCharges(
    Number(invoice.value?.subtotal),
    Number(invoice.value?.discount_amount ?? 0),
    Number(form.tax_percentage),
    Number(form.service_charge_percentage),
  ),
)
const checkoutBalance = computed(() =>
  Math.max(
    0,
    Math.round(
      (charges.value.total +
        Number(
          invoice.value?.order_amount ??
            Number(invoice.value?.food_order_amount ?? 0) +
              Number(invoice.value?.service_order_amount ?? 0),
        ) -
        Number(invoice.value?.paid_amount ?? 0)) *
        100,
    ) / 100,
  ),
)
watch(checkoutBalance, (value) => {
  if (mode.value === 'checkout') form.amount = Number.isFinite(value) ? value : ''
})
const controller = new AbortController()
const cashbooks = ref<PosCashbook[]>([])
const cashbooksLoading = ref(false)
const cashbookError = ref('')
async function loadCashbooks() {
  if (cashbooksLoading.value) return
  cashbooksLoading.value = true
  cashbookError.value = ''
  try {
    const result = await posCashbookService.list(controller.signal)
    if (!disposed) cashbooks.value = result
  } catch (cause) {
    if (!disposed) cashbookError.value = toApiError(cause).message
  } finally {
    if (!disposed) cashbooksLoading.value = false
  }
}
let disposed = false
async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await posBookingService.get(props.bookingId, controller.signal)
    if (!disposed) booking.value = result
  } catch (cause) {
    if (!disposed) error.value = toApiError(cause).message
  } finally {
    if (!disposed) loading.value = false
  }
}
onMounted(load)
watch(
  () => props.refreshKey,
  () => {
    if (!saving.value) void load()
  },
)
onBeforeUnmount(() => {
  disposed = true
  controller.abort()
})
function start(action: 'partial' | 'checkout') {
  if (recordedPayment.value || saving.value || props.disabled || loading.value) return
  if (action === 'partial' && Number(invoice.value?.balance_amount) <= 0) return
  if (
    action === 'checkout' &&
    invoice.value?.balance_amount != null &&
    Number(invoice.value.balance_amount) === 0
  ) {
    void checkoutSettledBooking()
    return
  }
  mode.value = action
  form.cashbook_id = ''
  void loadCashbooks()
  form.tax_percentage = Number(invoice.value?.tax_percentage ?? 0)
  form.service_charge_percentage = Number(invoice.value?.service_charge_percentage ?? 0)
  form.amount =
    action === 'checkout' && Number.isFinite(checkoutBalance.value) ? checkoutBalance.value : ''
  form.paid_at = ''
  form.note = ''
  error.value = ''
}
async function completeRecordedPayment() {
  const payment = recordedPayment.value
  if (!payment) return
  const fresh = await posBookingService.get(props.bookingId, controller.signal)
  if (disposed) return
  booking.value = fresh
  if (!disposed) recordedPayment.value = null
}
async function checkoutSettledBooking() {
  if (saving.value || props.disabled || booking.value?.status !== 'checked_in') return
  saving.value = true
  emit('busy', true)
  error.value = ''
  let succeeded = false
  try {
    const fresh = await posBookingService.get(props.bookingId, controller.signal)
    if (disposed) return
    booking.value = fresh
    if (
      fresh.balance_amount == null ||
      fresh.balance_amount === '' ||
      Number(fresh.balance_amount) !== 0
    )
      throw new Error('The balance has changed. Please review the invoice and check out again.')
    if (fresh.status !== 'checked_in') throw new Error('This booking is no longer checked in.')
    await loadCashbooks()
    if (disposed) return
    const lastPayment = fresh.payments?.at(-1)
    const cashbookId = lastPayment?.cashbook_id ?? cashbooks.value[0]?.id
    const now = new Date()
    const paidAt = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ')
    const payload = await checkoutPaymentSchema.validate(
      {
        cashbook_id: cashbookId,
        payment_method: lastPayment?.payment_method ?? 'cash',
        amount: 0,
        paid_at: paidAt,
        note: 'Checkout with balance already settled',
        tax_percentage: fresh.tax_percentage ?? 0,
        tax_amount: fresh.tax_amount ?? 0,
        service_charge_percentage: fresh.service_charge_percentage ?? 0,
        service_charge_amount: fresh.service_charge_amount ?? 0,
      },
      { abortEarly: false, stripUnknown: true },
    )
    await posBookingService.checkout(props.bookingId, payload, controller.signal)
    succeeded = true
  } catch (cause) {
    if (!disposed) error.value = toApiError(cause).message
  } finally {
    if (!disposed) {
      saving.value = false
      emit('busy', false)
      if (succeeded) emit('saved')
    }
  }
}
async function retryCompletion() {
  if (saving.value || props.disabled || !recordedPayment.value) return
  saving.value = true
  emit('busy', true)
  error.value = ''
  let succeeded = false
  try {
    await completeRecordedPayment()
    succeeded = true
  } catch (cause) {
    if (!disposed)
      error.value = `Payment was recorded. Completion failed: ${toApiError(cause).message}`
  } finally {
    if (!disposed) {
      saving.value = false
      emit('busy', false)
      if (succeeded) emit('saved')
    }
  }
}
async function save(action: 'check-in' | 'partial' | 'checkout') {
  if (saving.value || props.disabled || loading.value || !booking.value || recordedPayment.value)
    return
  if (action === 'check-in' && booking.value.status !== 'reserved') return
  if (action === 'checkout' && booking.value.status !== 'checked_in') return
  if (
    action === 'partial' &&
    (!['reserved', 'checked_in'].includes(booking.value.status) ||
      Number(invoice.value?.balance_amount) <= 0)
  )
    return
  if (action !== 'check-in' && (cashbooksLoading.value || cashbookError.value)) return
  saving.value = true
  emit('busy', true)
  error.value = ''
  let succeeded = false
  try {
    if (action === 'check-in') await posBookingService.checkIn(props.bookingId, controller.signal)
    else {
      const payload = await bookingPaymentSchema.validate(
        action === 'checkout' ? { ...form, amount: checkoutBalance.value } : form,
        {
          abortEarly: false,
          stripUnknown: true,
        },
      )
      if (action === 'partial' && payload.amount <= 0)
        throw new Error('Partial payment must be greater than zero.')
      if (!cashbooks.value.some((cashbook) => cashbook.id === payload.cashbook_id))
        throw new Error('Choose a cashbook from the list.')
      if (disposed) return
      if (action === 'checkout') {
        const checkout = await checkoutPaymentSchema.validate(
          {
            ...payload,
            tax_percentage: form.tax_percentage,
            service_charge_percentage: form.service_charge_percentage,
            tax_amount: charges.value.tax_amount,
            service_charge_amount: charges.value.service_charge_amount,
          },
          { abortEarly: false, stripUnknown: true },
        )
        if (disposed) return
        await posBookingService.checkout(props.bookingId, checkout, controller.signal)
      } else {
        const partial = await partialPaymentSchema.validate(form, {
          abortEarly: false,
          stripUnknown: true,
        })
        if (!cashbooks.value.some((cashbook) => cashbook.id === partial.cashbook_id))
          throw new Error('Choose a cashbook from the list.')
        if (disposed) return
        await posBookingService.partialPayment(props.bookingId, partial, controller.signal)
        if (disposed) return
        recordedPayment.value = partial
        mode.value = null
        await completeRecordedPayment()
      }
    }
    succeeded = true
  } catch (cause) {
    if (!disposed)
      error.value =
        (recordedPayment.value ? 'Payment was recorded. Completion failed: ' : '') +
        (cause instanceof ValidationError ? cause.errors.join(' ') : toApiError(cause).message)
  } finally {
    if (!disposed) {
      saving.value = false
      emit('busy', false)
      if (succeeded) emit('saved')
    }
  }
}
function submit() {
  if (mode.value) void save(mode.value)
}
</script>
<template>
  <section class="booking-actions">
    <h3>Stay &amp; payments</h3>
    <p v-if="loading" role="status">Loading booking balance…</p>
    <p v-if="error" class="error" role="alert">
      {{ error }} <button v-if="!booking && !loading" type="button" @click="load">Retry</button>
    </p>
    <button
      v-if="recordedPayment"
      type="button"
      :disabled="saving || disabled"
      @click="retryCompletion"
    >
      Retry payment completion
    </button>
    <template v-if="booking && !loading"
      ><dl>
        <dt>Subtotal</dt>
        <dd>{{ invoice?.subtotal }}</dd>
        <dt>Discount</dt>
        <dd>{{ invoice?.discount_amount }}</dd>
        <dt>Tax</dt>
        <dd>{{ invoice?.tax_amount ?? '0.00' }}</dd>
        <dt>Service charge</dt>
        <dd>{{ invoice?.service_charge_amount ?? '0.00' }}</dd>
        <dt>Room total</dt>
        <dd>{{ invoice?.room_total_amount ?? invoice?.total_amount }}</dd>
        <dt>Food orders</dt>
        <dd>{{ invoice?.food_order_amount ?? '0.00' }}</dd>
        <dt>Service orders</dt>
        <dd>{{ invoice?.service_order_amount ?? '0.00' }}</dd>
        <dt>Orders total</dt>
        <dd>{{ invoice?.order_amount ?? '?' }}</dd>
        <dt>Grand total</dt>
        <dd>{{ invoice?.grand_total_amount ?? invoice?.total_amount }}</dd>
        <dt>Paid</dt>
        <dd>{{ invoice?.paid_amount }}</dd>
        <dt>Balance</dt>
        <dd>{{ invoice?.balance_amount }}</dd>
      </dl>
      <div class="actions">
        <button
          v-if="booking.status === 'reserved'"
          type="button"
          :disabled="saving || disabled || !!recordedPayment"
          @click="save('check-in')"
        >
          Check in</button
        ><button
          v-if="
            ['reserved', 'checked_in'].includes(booking.status) &&
            Number(invoice?.balance_amount) > 0
          "
          type="button"
          :disabled="saving || disabled || !!recordedPayment"
          @click="start('partial')"
        >
          Partial payment</button
        ><button
          v-if="booking.status === 'checked_in'"
          type="button"
          :disabled="saving || disabled || !!recordedPayment"
          @click="start('checkout')"
        >
          Check out
        </button>
      </div>
      <form v-if="mode" novalidate @submit.prevent="submit">
        <h4>{{ mode === 'checkout' ? 'Checkout payment' : 'Partial payment' }}</h4>
        <fieldset :disabled="saving || disabled || !!recordedPayment">
          <div>
            <label
              >Cashbook<select
                v-model="form.cashbook_id"
                name="cashbook_id"
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
          </div>
          <template v-if="mode === 'checkout'">
            <label
              >Tax (%)<input
                v-model.number="form.tax_percentage"
                name="tax_percentage"
                type="number"
                min="0"
                max="100"
                step="any"
            /></label>
            <label
              >Service charge (%)<input
                v-model.number="form.service_charge_percentage"
                name="service_charge_percentage"
                type="number"
                min="0"
                max="100"
                step="any"
            /></label>
            <label
              >Tax amount<input
                :value="charges.tax_amount"
                name="tax_amount"
                type="number"
                readonly
            /></label>
            <label
              >Service charge amount<input
                :value="charges.service_charge_amount"
                name="service_charge_amount"
                type="number"
                readonly
            /></label>
            <p>
              Charges apply to the subtotal after discount. Amount due includes these charges and
              deducts payments already made.
            </p>
          </template>
          <label
            >Payment method<select v-model="form.payment_method" name="payment_method">
              <option v-for="method in bookingPaymentMethods" :key="method" :value="method">
                {{ method }}
              </option>
            </select></label
          ><label
            >Amount<input
              v-model="form.amount"
              name="amount"
              :readonly="mode === 'checkout'"
              type="number"
              min="0"
              step="any" /></label
          ><label
            >Paid at<input
              v-model="form.paid_at"
              name="paid_at"
              type="datetime-local"
              step="1" /></label
          ><label>Note<textarea v-model="form.note" name="note" rows="2" /></label>
          <div class="actions">
            <button type="button" @click="mode = null">Cancel</button
            ><button
              type="submit"
              class="primary"
              :disabled="cashbooksLoading || !!cashbookError || !cashbooks.length"
            >
              {{ saving ? 'Saving…' : mode === 'checkout' ? 'Confirm checkout' : 'Record payment' }}
            </button>
          </div>
        </fieldset>
      </form>
    </template>
  </section>
</template>
<style scoped>
input[readonly] {
  background: #f1f5f9;
  color: #475569;
  cursor: default;
}
.booking-actions {
  margin: 18px 0;
  padding: 16px;
  border: 1px solid #dce8f0;
  border-radius: 10px;
  background: #f7fafc;
  font-size: 12px;
}
h3 {
  margin: 0 0 16px;
}
dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
dd {
  margin: 0;
  text-align: right;
  font-weight: 600;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
button {
  padding: 9px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  color: #334155;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
fieldset {
  border: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}
label {
  display: grid;
  gap: 6px;
}
input,
select,
textarea {
  padding: 10px;
  font: inherit;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
}
.primary {
  background: #0e7490;
  color: white;
  border-color: #0e7490;
}
.error {
  color: #b91c1c;
}
:is(button, input, select, textarea):focus-visible {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
}
</style>
