<script setup lang="ts">
import { t } from '@/i18n'
import { usePermissions } from '@/composables/usePermissions'
const { can } = usePermissions()

import { calculatePosCharges } from '@/utils/pos-charges'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ValidationError } from 'yup'
import AppIcon from '@/components/common/AppIcon.vue'
import {
  posServiceOrderService,
  serviceOrderStatuses,
  type ServiceItem,
  type ServiceOrder,
  type ServiceOrderStatus,
} from '@/services/pos-service-order.service'
import { serviceOrderSchema } from '@/schemas/pos-service-order.schema'
import { statusLabel } from '@/constants/hotel-status'
import { toApiError } from '@/services/api/api-error'
const props = defineProps<{
  roomId: number
  bookingId: number
  canOrder: boolean
  serviceType: 'amenity' | 'laundry'
}>()
const emit = defineEmits<{ busy: [value: boolean]; saved: [] }>()
const menus = ref<ServiceItem[]>([])
const orders = ref<ServiceOrder[]>([])
const menuError = ref('')
const orderError = ref('')
const error = ref('')
const notice = ref('')
const loadingMenus = ref(true)
const loadingOrders = ref(true)
const busy = ref(false)
const query = ref('')
const cart = ref<{ item_id: number; qty: number; note: string }[]>([])
const form = reactive({
  discount_amount: 0,
  tax_percentage: 0,
  service_charge_percentage: 0,
  note: '',
})
const statuses = reactive<Record<number, ServiceOrderStatus>>({})
let disposed = false
const controller = new AbortController()
let menuController: AbortController | undefined
let orderController: AbortController | undefined
const visibleMenus = computed(() =>
  menus.value.filter(
    (item) =>
      item.is_active &&
      `${item.name} ${item.code} ${item.description || ''}`
        .toLowerCase()
        .includes(query.value.trim().toLowerCase()),
  ),
)
const subtotal = computed(() =>
  cart.value.reduce(
    (sum, item) =>
      sum +
      Number(menus.value.find((menu) => menu.id === item.item_id)?.price || 0) * Number(item.qty),
    0,
  ),
)
const charges = computed(() =>
  calculatePosCharges(
    subtotal.value,
    Number(form.discount_amount),
    Number(form.tax_percentage),
    Number(form.service_charge_percentage),
  ),
)
const estimate = computed(() => charges.value.total)
function money(value: number) {
  return Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '—'
}
function itemName(id: number) {
  return menus.value.find((menu) => menu.id === id)?.name || `Item #${id}`
}
function add(menu: ServiceItem) {
  const existing = cart.value.find((item) => item.item_id === menu.id)
  if (existing) existing.qty++
  else cart.value.push({ item_id: menu.id, qty: 1, note: '' })
  notice.value = ''
}
async function loadMenus() {
  if (!can('service_orders.create')) return
  menuController?.abort()
  const active = new AbortController()
  menuController = active
  loadingMenus.value = true
  menuError.value = ''
  try {
    const result = await posServiceOrderService.items(props.serviceType, active.signal)
    if (!disposed && !active.signal.aborted) menus.value = result
  } catch (cause) {
    if (!disposed && !active.signal.aborted) menuError.value = toApiError(cause).message
  } finally {
    if (!disposed && !active.signal.aborted) loadingMenus.value = false
  }
}
async function loadOrders() {
  if (!can('service_orders.view')) return
  orderController?.abort()
  const active = new AbortController()
  orderController = active
  loadingOrders.value = true
  orderError.value = ''
  try {
    const result = await posServiceOrderService.orders(active.signal)
    if (!disposed && !active.signal.aborted) {
      orders.value = result.filter(
        (order) =>
          Number(order.booking_id) === props.bookingId &&
          Number(order.room_id) === props.roomId &&
          order.type === props.serviceType,
      )
      for (const order of orders.value)
        if (serviceOrderStatuses.includes(order.status as ServiceOrderStatus))
          statuses[order.id] = order.status as ServiceOrderStatus
    }
  } catch (cause) {
    if (!disposed && !active.signal.aborted) orderError.value = toApiError(cause).message
  } finally {
    if (!disposed && !active.signal.aborted) loadingOrders.value = false
  }
}
function setBusy(value: boolean) {
  busy.value = value
  emit('busy', value)
}
async function submit() {
  if (!can('service_orders.create')) return
  if (busy.value || !props.canOrder) return
  setBusy(true)
  error.value = ''
  notice.value = ''
  try {
    const payload = await serviceOrderSchema.validate(
      {
        ...form,
        tax_amount: charges.value.tax_amount,
        service_charge_amount: charges.value.service_charge_amount,
        type: props.serviceType,
        items: cart.value,
        booking_id: props.bookingId,
        room_id: props.roomId,
      },
      { abortEarly: false, stripUnknown: true },
    )
    if (
      payload.items.some(
        (item) => !menus.value.some((menu) => menu.id === item.item_id && menu.is_active),
      )
    )
      throw new Error('An item is no longer available. Refresh the services.')
    if (Number.isFinite(subtotal.value) && payload.discount_amount > subtotal.value)
      throw new Error('Discount cannot exceed the subtotal.')
    if (disposed) return
    await posServiceOrderService.create(payload, controller.signal)
    if (disposed) return
    cart.value = []
    form.discount_amount = 0
    form.tax_percentage = 0
    form.service_charge_percentage = 0
    form.note = ''
    emit('saved')
    notice.value = 'Service order created.'
    await loadOrders()
  } catch (cause) {
    if (!disposed)
      error.value =
        cause instanceof ValidationError ? cause.errors.join(' ') : toApiError(cause).message
  } finally {
    if (!disposed) setBusy(false)
  }
}
async function update(order: ServiceOrder) {
  if (!can('service_orders.update_status')) return
  const status = statuses[order.id]
  if (busy.value || !status || !serviceOrderStatuses.includes(status) || status === order.status)
    return
  setBusy(true)
  error.value = ''
  notice.value = ''
  try {
    await posServiceOrderService.updateStatus(order.id, status, controller.signal)
    if (!disposed) {
      order.status = status
      emit('saved')
      notice.value = 'Order status updated.'
      await loadOrders()
    }
  } catch (cause) {
    if (!disposed) error.value = toApiError(cause).message
  } finally {
    if (!disposed) setBusy(false)
  }
}
onMounted(() => {
  void loadMenus()
  void loadOrders()
})
onBeforeUnmount(() => {
  disposed = true
  controller.abort()
  menuController?.abort()
  orderController?.abort()
})
</script>
<template>
  <div class="food-panel">
    <p v-if="notice" role="status" class="notice">{{ t(notice) }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
    <form v-if="canOrder && can('service_orders.create')" novalidate @submit.prevent="submit">
      <fieldset :disabled="busy">
        <legend>{{ serviceType === 'amenity' ? t('Amenities') : t('Laundry') }}</legend>
        <label class="search"
          ><AppIcon name="search" :size="16" /><input
            v-model="query"
            type="search"
            :placeholder="t('Search services')"
            :aria-label="t('Search services')"
        /></label>
        <p v-if="loadingMenus" role="status">{{ t('Loading services…') }}</p>
        <p v-else-if="menuError" class="error" role="alert">
          {{ t(menuError) }}
          <button type="button" @click="loadMenus">{{ t('Retry services') }}</button>
        </p>
        <div v-else class="menu-grid">
          <article v-for="menu in visibleMenus" :key="menu.id" class="menu-card">
            <div class="menu-placeholder"><AppIcon name="items" :size="26" /></div>
            <div class="menu-title">
              <strong>{{ menu.name }}</strong
              ><span
                >{{ menu.price
                }}<small v-if="menu.stock_unit"> / {{ menu.stock_unit.symbol }}</small></span
              >
            </div>
            <p v-if="menu.description" class="menu-description">{{ menu.description }}</p>
            <button type="button" :aria-label="t('Add {0}', [menu.name])" @click="add(menu)">
              <AppIcon name="add" :size="14" /> {{ t('Add') }}
            </button>
          </article>
          <p v-if="!visibleMenus.length">{{ t('No matching active service items.') }}</p>
        </div>
        <section class="summary">
          <h3>
            <AppIcon name="ledger" :size="16" /> {{ t('Order summary') }}
            <small>{{ cart.length }} {{ t('items') }} </small>
          </h3>
          <p v-if="!cart.length">{{ t('Select services above.') }}</p>
          <article v-for="item in cart" :key="item.item_id" class="cart-line">
            <strong>{{ itemName(item.item_id) }}</strong
            ><button
              type="button"
              :aria-label="t('Remove {0}', [itemName(item.item_id)])"
              @click="cart = cart.filter((row) => row.item_id !== item.item_id)"
            >
              <AppIcon name="remove" :size="15" />
            </button>
            <label>
              {{ t('Quantity') }}
              <input
                v-model.number="item.qty"
                :name="`qty-${item.item_id}`"
                type="number"
                min="1"
                step="1"
            /></label>
            <label>
              {{ t('Item note') }}
              <input
                v-model="item.note"
                :name="`note-${item.item_id}`"
                :placeholder="t('Special instructions')"
            /></label>
          </article>
          <div class="amounts">
            <label>
              {{ t('Discount amount') }}
              <input
                v-model.number="form.discount_amount"
                name="discount_amount"
                type="number"
                min="0"
                step="any" /></label
            ><label>
              {{ t('Tax (%)') }}
              <input
                v-model.number="form.tax_percentage"
                name="tax_percentage"
                type="number"
                min="0"
                max="100"
                step="any"
            /></label>
            <label>
              {{ t('Service charge (%)') }}
              <input
                v-model.number="form.service_charge_percentage"
                name="service_charge_percentage"
                type="number"
                min="0"
                max="100"
                step="any"
            /></label>
            <label>
              {{ t('Service charge amount') }}
              <input
                :value="charges.service_charge_amount"
                name="service_charge_amount"
                type="number"
                readonly
            /></label>
            <label>
              {{ t('Tax amount') }}
              <input
                :value="charges.tax_amount"
                readonly
                name="tax_amount"
                type="number"
                min="0"
                step="any"
            /></label>
          </div>
          <label>
            {{ t('Order note') }}
            <textarea v-model="form.note" name="note" rows="2" :placeholder="t('Send to room')" />
          </label>
          <dl>
            <dt>{{ t('Subtotal') }}</dt>
            <dd>{{ money(subtotal) }}</dd>
            <dt>{{ t('Estimated order total') }}</dt>
            <dd>{{ money(estimate) }}</dd>
          </dl>
          <small> {{ t('Final amounts are confirmed by the server.') }} </small>
        </section>
        <button
          class="primary"
          type="submit"
          :disabled="busy || !cart.length || loadingMenus || !!menuError"
        >
          {{ busy ? t('Saving…') : t('Create service order') }}
        </button>
      </fieldset>
    </form>
    <section v-if="can('service_orders.view')" class="existing">
      <h3>
        {{ t('Ordered services') }}
        <button
          type="button"
          :aria-label="t('Refresh service orders')"
          :disabled="busy || loadingOrders"
          @click="loadOrders"
        >
          <AppIcon name="refresh" :size="15" />
        </button>
      </h3>
      <p v-if="loadingOrders" role="status">{{ t('Loading orders…') }}</p>
      <p v-else-if="orderError" class="error" role="alert">
        {{ t(orderError) }}
        <button type="button" @click="loadOrders">{{ t('Retry orders') }}</button>
      </p>
      <template v-else
        ><p v-if="!orders.length">{{ t('No service orders for this booking.') }}</p>
        <article v-for="order in orders" :key="order.id" class="order-card">
          <h4>
            {{ order.order_no || t('Order #{0}', [order.id]) }}
            <span>{{ t(statusLabel(order.status)) }}</span>
          </h4>
          <ul v-if="order.items?.length">
            <li v-for="(item, index) in order.items" :key="item.id || index">
              {{ item.qty }} × {{ item.item?.name || itemName(item.item_id)
              }}<small v-if="item.unit_price != null">
                {{ t('Unit price:') }} {{ item.unit_price }}</small
              ><strong v-if="item.total != null" class="line-total">
                {{ t('Line total:') }} {{ item.total }}</strong
              ><small v-if="item.note">{{ item.note }}</small>
            </li>
          </ul>
          <p v-if="order.note">{{ order.note }}</p>
          <dl class="order-totals">
            <template v-if="order.subtotal != null"
              ><dt>{{ t('Subtotal') }}</dt>
              <dd>{{ order.subtotal }}</dd></template
            >
            <template v-if="order.discount_amount != null"
              ><dt>{{ t('Discount') }}</dt>
              <dd>{{ order.discount_amount }}</dd></template
            >
            <template v-if="order.tax_amount != null"
              ><dt>{{ t('Tax') }}</dt>
              <dd>{{ order.tax_amount }}</dd></template
            >
            <template v-if="order.service_charge_amount != null"
              ><dt>{{ t('Service charge') }}</dt>
              <dd>{{ order.service_charge_amount }}</dd></template
            >
            <template v-if="order.total_amount != null"
              ><dt>{{ t('Total') }}</dt>
              <dd>{{ order.total_amount }}</dd></template
            >
          </dl>
          <div v-if="can('service_orders.update_status')" class="status-controls">
            <label>
              {{ t('Status') }}
              <select
                v-if="can('service_orders.update_status')"
                v-model="statuses[order.id]"
                :aria-label="t('Status for order {0}', [order.id])"
                :disabled="busy"
              >
                <option v-for="status in serviceOrderStatuses" :key="status" :value="status">
                  {{ t(statusLabel(status)) }}
                </option>
              </select></label
            ><button
              type="button"
              :disabled="busy || !statuses[order.id] || statuses[order.id] === order.status"
              v-show="can('service_orders.update_status')"
              @click="update(order)"
            >
              {{ t('Update') }}
            </button>
          </div>
        </article>
      </template>
    </section>
  </div>
</template>
<style scoped>
input[readonly] {
  background: #f1f5f9;
  color: #475569;
  cursor: default;
}
.menu-categories {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin: 0 0 14px;
  padding: 3px;
}
.menu-categories button {
  white-space: nowrap;
  border-radius: 16px;
}
.menu-categories button[aria-pressed='true'] {
  background: #e0f2fe;
  border-color: #38bdf8;
  color: #075985;
}
.menu-description {
  font-size: 11px;
  color: #64748b;
  margin: 0 0 10px;
}

.line-total {
  display: block;
  margin: 5px 0;
}
.order-totals {
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
}
.food-panel {
  font-size: 12px;
  color: #334155;
}
fieldset {
  padding: 0;
  border: 0;
  min-width: 0;
}
legend {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 16px;
}
h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
h3 small,
h3 button {
  margin-left: auto;
}
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11px;
}
input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 9px;
  border: 1px solid #dce5ef;
  border-radius: 6px;
  font: inherit;
  background: white;
  color: inherit;
}
.search {
  flex-direction: row;
  align-items: center;
  margin-bottom: 14px;
}
.menu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  max-height: 330px;
  overflow-y: auto;
}
.menu-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  padding: 6px;
}
img,
.menu-placeholder {
  width: 100%;
  height: 85px;
  object-fit: cover;
  border-radius: 4px;
}
.menu-placeholder {
  display: grid;
  place-items: center;
  background: #eef6fa;
  color: #61a2bd;
}
.menu-title {
  display: flex;
  justify-content: space-between;
  gap: 5px;
  padding: 10px 0;
  font-size: 11px;
}
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 10px;
  border: 1px solid #dce5ef;
  border-radius: 5px;
  background: #f8fafc;
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.menu-card button,
.primary {
  width: 100%;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
.summary {
  border: 1px solid #dae8f1;
  background: #f7fafc;
  padding: 12px;
  border-radius: 9px;
  margin: 20px 0 12px;
}
.cart-line {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  border-top: 1px solid #e2e8f0;
  padding: 12px 0;
}
.cart-line label:last-child {
  grid-column: 1/-1;
}
.cart-line input[type='number'] {
  width: 85px;
}
.amounts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
dl {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
}
dd {
  margin: 0;
  font-weight: 700;
}
.primary {
  background: #12263c;
  color: white;
  padding: 12px;
}
.existing {
  margin-top: 26px;
  border-top: 1px solid #e2e8f0;
}
.order-card {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin: 10px 0;
}
h4 {
  margin: 0 0 10px;
  display: flex;
  justify-content: space-between;
}
h4 span {
  color: #0e7490;
  font-weight: 500;
}
li small {
  display: block;
  color: #64748b;
}
.status-controls {
  display: flex;
  align-items: end;
  gap: 10px;
}
.status-controls label {
  flex: 1;
}
.error {
  color: #b91c1c;
}
.notice {
  color: #15803d;
  background: #f0fdf4;
  padding: 10px;
}
:is(button, input, select, textarea):focus-visible {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
}
</style>
