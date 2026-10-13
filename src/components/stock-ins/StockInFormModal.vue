<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import AppIcon from '@/components/common/AppIcon.vue'
import { supplierService } from '@/services/supplier.service'
import { cashbookService } from '@/services/cashbook.service'
import type { Supplier } from '@/types/supplier'
import type { Cashbook } from '@/types/cashbook'
import { stockInService } from '@/services/stock-in.service'
import { warehouseService } from '@/services/warehouse.service'
import { itemService } from '@/services/item.service'
import { unitService } from '@/services/unit.service'
import { createStockInSchema, stockInStatusSchema } from '@/schemas/stock-in.schema'
import { toApiError } from '@/services/api/api-error'
import type { StockIn } from '@/types/stock-in'
import type { Warehouse } from '@/types/warehouse'
import type { Item } from '@/types/item'
import type { Unit } from '@/types/unit'

const props = defineProps<{ page?: boolean; stockIn?: StockIn | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const statusOnly = computed(() => props.stockIn != null)
const prefix = useId()
const dialog = ref<HTMLDialogElement | null>(null)
let nextRowKey = 0
function newRow() {
  return {
    key: nextRowKey++,
    item_id: '' as number | string,
    unit_id: '' as number | string,
    quantity: '' as number | string,
    unit_cost: '' as number | string,
  }
}
const form = reactive({
  supplier_id: '' as number | string,
  cashbook_id: '' as number | string,
  total_amount: '' as number | string,
  paid_amount: 0 as number | string,
  warehouse_id: '' as number | string,
  transaction_date: '',
  status:
    props.stockIn?.status === 'posted' || props.stockIn?.status === 'cancelled'
      ? props.stockIn.status
      : '',
  items: [newRow()],
})
const suppliers = ref<Supplier[]>([])
const cashbooks = ref<Cashbook[]>([])
const warehouses = ref<Warehouse[]>([])
const items = ref<Item[]>([])
const units = ref<Unit[]>([])
const loading = ref(true)
const saving = ref(false)
defineExpose({ saving })
const loadError = ref('')
const saveError = ref('')
const errors = ref<Record<string, string>>({})
let controller: AbortController | undefined
let disposed = false
let previousFocus: HTMLElement | null = null
function addItem() {
  form.items.push(newRow())
  errors.value = {}
}
function removeItem(index: number) {
  form.items.splice(index, 1)
  errors.value = {}
}
async function load() {
  if (disposed || (loading.value && controller)) return
  controller = new AbortController()
  const active = controller
  loading.value = true
  loadError.value = ''
  try {
    if (!statusOnly.value) {
      const [warehouseOptions, itemOptions, unitOptions, supplierOptions, cashbookOptions] =
        await Promise.all([
          warehouseService.listOptions(active.signal),
          itemService.listOptions(active.signal),
          unitService.listOptions(active.signal),
          supplierService.listOptions(active.signal),
          cashbookService.listOptions(active.signal),
        ])
      if (disposed || active.signal.aborted) return
      warehouses.value = warehouseOptions
      items.value = itemOptions
      units.value = unitOptions
      suppliers.value = supplierOptions
      cashbooks.value = cashbookOptions
    }
  } catch (cause) {
    if (!disposed) {
      loadError.value = toApiError(cause).message
      active.abort()
    }
  } finally {
    if (!disposed) {
      loading.value = false
      await nextTick()
      dialog.value?.querySelector<HTMLElement>('input, select')?.focus()
    }
  }
}
onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  if (!props.page) dialog.value?.showModal()
  void load()
})
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
  if (!props.page) dialog.value?.close()
  if (!props.page) previousFocus?.focus()
})
function close() {
  if (!saving.value) emit('close')
}
async function submit() {
  if (saving.value || loading.value || loadError.value || disposed) return
  saving.value = true
  errors.value = {}
  saveError.value = ''
  try {
    if (props.stockIn) {
      const payload = await stockInStatusSchema.validate(
        { status: form.status },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await stockInService.updateStatus(props.stockIn.id, payload)
    } else {
      const payload = await createStockInSchema.validate(
        {
          warehouse_id: form.warehouse_id,
          supplier_id: form.supplier_id,
          cashbook_id: form.cashbook_id,
          total_amount: form.total_amount,
          paid_amount: form.paid_amount,
          transaction_date: form.transaction_date,
          items: form.items.map(({ item_id, unit_id, quantity, unit_cost }) => ({
            item_id,
            unit_id,
            quantity,
            unit_cost,
          })),
        },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await stockInService.create(payload)
    }
    if (!disposed) emit('saved')
  } catch (cause) {
    if (disposed) return
    if (cause instanceof ValidationError) {
      for (const issue of cause.inner)
        if (issue.path && !errors.value[issue.path]) errors.value[issue.path] = issue.message
    } else saveError.value = toApiError(cause).message
  } finally {
    if (!disposed) {
      saving.value = false
      await nextTick()
      dialog.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    }
  }
}
</script>
<template>
  <component
    :is="page ? 'section' : 'dialog'"
    data-form-surface
    :class="{ 'form-page': page }"
    ref="dialog"
    class="stock-in-modal"
    :aria-labelledby="`${prefix}-title`"
    @cancel.prevent="close"
  >
    <form novalidate :aria-busy="loading || saving" @submit.prevent="submit">
      <header>
        <component :is="page ? 'h1' : 'h2'" :id="`${prefix}-title`">
          {{ statusOnly ? 'Update stock in status' : 'Add stock in' }}
        </component>
        <button
          type="button"
          :aria-label="page ? 'Back to list' : 'Close dialog'"
          :disabled="saving"
          @click="close"
        >
          <AppIcon name="close" />
        </button>
      </header>
      <p v-if="loading" role="status">Loading stock in options...</p>
      <div v-else-if="loadError" role="alert" class="error">
        <p>{{ loadError }}</p>
        <button type="button" @click="load">Try again</button>
      </div>
      <template v-else
        ><p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
        <fieldset :disabled="saving">
          <template v-if="statusOnly"
            ><p>
              Stock in #{{ stockIn?.id }} &middot; Current status:
              {{ stockIn?.status ?? 'Unknown' }}
            </p>
            <div class="field">
              <label :for="`${prefix}-status`">Status</label
              ><select
                :id="`${prefix}-status`"
                name="status"
                v-model="form.status"
                :aria-invalid="!!errors.status"
                :aria-describedby="errors.status ? `${prefix}-status-error` : undefined"
                required
              >
                <option value="" disabled>Choose status</option>
                <option value="posted">Posted</option>
                <option value="cancelled">Cancelled</option></select
              ><span v-if="errors.status" :id="`${prefix}-status-error`" class="error">{{
                errors.status
              }}</span>
            </div></template
          >
          <template v-else
            ><div class="field">
              <label :for="`${prefix}-warehouse_id`">Warehouse</label
              ><select
                :id="`${prefix}-warehouse_id`"
                name="warehouse_id"
                v-model="form.warehouse_id"
                :aria-invalid="!!errors.warehouse_id"
                :aria-describedby="errors.warehouse_id ? `${prefix}-warehouse_id-error` : undefined"
                required
              >
                <option value="" disabled>Choose a warehouse</option>
                <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                  {{ warehouse.name }} ({{ warehouse.code }})
                </option></select
              ><small v-if="!warehouses.length"
                >No warehouses found. Create a warehouse first.</small
              ><span
                v-if="errors.warehouse_id"
                :id="`${prefix}-warehouse_id-error`"
                class="error"
                >{{ errors.warehouse_id }}</span
              >
            </div>
            <div
              v-for="field in ['supplier_id', 'cashbook_id'] as const"
              :key="field"
              class="field"
            >
              <label :for="`${prefix}-${field}`">{{
                field === 'supplier_id' ? 'Supplier' : 'Cashbook'
              }}</label>
              <select
                :id="`${prefix}-${field}`"
                v-model="form[field]"
                :name="field"
                required
                :aria-invalid="!!errors[field]"
              >
                <option value="">
                  Select {{ field === 'supplier_id' ? 'supplier' : 'cashbook' }}
                </option>
                <option
                  v-for="option in field === 'supplier_id' ? suppliers : cashbooks"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.name }}
                </option></select
              ><span v-if="errors[field]" class="error">{{ errors[field] }}</span>
            </div>
            <div
              v-for="field in ['total_amount', 'paid_amount'] as const"
              :key="field"
              class="field"
            >
              <label :for="`${prefix}-${field}`">{{
                field === 'total_amount' ? 'Total amount' : 'Paid amount'
              }}</label>
              <input
                :id="`${prefix}-${field}`"
                v-model="form[field]"
                :name="field"
                type="number"
                min="0"
                step="any"
                required
                :aria-invalid="!!errors[field]"
              />
              <span v-if="errors[field]" class="error">{{ errors[field] }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-transaction_date`">Transaction date and time</label
              ><input
                :id="`${prefix}-transaction_date`"
                name="transaction_date"
                v-model="form.transaction_date"
                :aria-invalid="!!errors.transaction_date"
                :aria-describedby="
                  errors.transaction_date ? `${prefix}-transaction_date-error` : undefined
                "
                type="datetime-local"
                step="1"
                required
              /><small>Use the warehouse’s local date and time.</small
              ><span
                v-if="errors.transaction_date"
                :id="`${prefix}-transaction_date-error`"
                class="error"
                >{{ errors.transaction_date }}</span
              >
            </div>
            <section class="lines" aria-label="Stock in items">
              <h3>Items</h3>
              <small v-if="!items.length">No items found. Create an item first.</small
              ><small v-if="!units.length">No units found. Create a unit first.</small>
              <p v-if="errors.items" role="alert" class="error">{{ errors.items }}</p>
              <div v-for="(row, index) in form.items" :key="row.key" class="item-row">
                <h4>Item {{ index + 1 }}</h4>
                <div class="line-fields">
                  <div class="field">
                    <label :for="`${prefix}-item-${row.key}-item_id`">Item</label
                    ><select
                      :id="`${prefix}-item-${row.key}-item_id`"
                      :name="`items[${index}].item_id`"
                      v-model="row.item_id"
                      :aria-invalid="!!errors[`items[${index}].item_id`]"
                      :aria-describedby="
                        errors[`items[${index}].item_id`]
                          ? `${prefix}-item-${row.key}-item_id-error`
                          : undefined
                      "
                      required
                    >
                      <option value="" disabled>Choose item</option>
                      <option v-for="option in items" :key="option.id" :value="option.id">
                        {{ option.name }} ({{ option.code }})
                      </option></select
                    ><span
                      v-if="errors[`items[${index}].item_id`]"
                      :id="`${prefix}-item-${row.key}-item_id-error`"
                      class="error"
                      >{{ errors[`items[${index}].item_id`] }}</span
                    >
                  </div>
                  <div class="field">
                    <label :for="`${prefix}-item-${row.key}-unit_id`">Unit</label
                    ><select
                      :id="`${prefix}-item-${row.key}-unit_id`"
                      :name="`items[${index}].unit_id`"
                      v-model="row.unit_id"
                      :aria-invalid="!!errors[`items[${index}].unit_id`]"
                      :aria-describedby="
                        errors[`items[${index}].unit_id`]
                          ? `${prefix}-item-${row.key}-unit_id-error`
                          : undefined
                      "
                      required
                    >
                      <option value="" disabled>Choose unit</option>
                      <option v-for="option in units" :key="option.id" :value="option.id">
                        {{ option.name }} ({{ option.symbol }})
                      </option></select
                    ><span
                      v-if="errors[`items[${index}].unit_id`]"
                      :id="`${prefix}-item-${row.key}-unit_id-error`"
                      class="error"
                      >{{ errors[`items[${index}].unit_id`] }}</span
                    >
                  </div>
                  <div class="field">
                    <label :for="`${prefix}-item-${row.key}-quantity`">Quantity</label
                    ><input
                      :id="`${prefix}-item-${row.key}-quantity`"
                      :name="`items[${index}].quantity`"
                      v-model="row.quantity"
                      :aria-invalid="!!errors[`items[${index}].quantity`]"
                      :aria-describedby="
                        errors[`items[${index}].quantity`]
                          ? `${prefix}-item-${row.key}-quantity-error`
                          : undefined
                      "
                      type="number"
                      min="0"
                      step="any"
                      required
                    /><span
                      v-if="errors[`items[${index}].quantity`]"
                      :id="`${prefix}-item-${row.key}-quantity-error`"
                      class="error"
                      >{{ errors[`items[${index}].quantity`] }}</span
                    >
                  </div>
                  <div class="field">
                    <label :for="`${prefix}-item-${row.key}-unit_cost`">Unit cost</label
                    ><input
                      :id="`${prefix}-item-${row.key}-unit_cost`"
                      :name="`items[${index}].unit_cost`"
                      v-model="row.unit_cost"
                      :aria-invalid="!!errors[`items[${index}].unit_cost`]"
                      :aria-describedby="
                        errors[`items[${index}].unit_cost`]
                          ? `${prefix}-item-${row.key}-unit_cost-error`
                          : undefined
                      "
                      type="number"
                      min="0"
                      step="any"
                      required
                    /><span
                      v-if="errors[`items[${index}].unit_cost`]"
                      :id="`${prefix}-item-${row.key}-unit_cost-error`"
                      class="error"
                      >{{ errors[`items[${index}].unit_cost`] }}</span
                    >
                  </div>
                </div>
                <button
                  type="button"
                  :aria-label="`Remove item ${index + 1}`"
                  @click="removeItem(index)"
                >
                  <AppIcon name="remove" :size="16" /> Remove item
                </button>
              </div>
              <button type="button" @click="addItem">
                <AppIcon name="add" :size="16" /> Add item
              </button>
            </section></template
          >
        </fieldset></template
      >
      <footer>
        <button type="button" :disabled="saving" @click="close">Cancel</button
        ><button type="submit" class="primary" :disabled="saving || loading || !!loadError">
          {{ saving ? 'Saving...' : statusOnly ? 'Update status' : 'Create stock in' }}
        </button>
      </footer>
    </form>
  </component>
</template>
<style scoped>
.stock-in-modal {
  width: min(720px, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #1e293b;
  box-shadow: 0 24px 64px #0f172a33;
}
.stock-in-modal::backdrop {
  background: #0f172a80;
}
header,
footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
h2 {
  margin: 0;
  font-size: 1.25rem;
}
h3 {
  margin: 0;
  font-size: 1rem;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 1.5rem 0;
  min-width: 0;
  display: grid;
  gap: 1rem;
}
.field {
  display: grid;
  align-content: start;
  gap: 0.4rem;
  min-width: 0;
}
label {
  font-size: 0.875rem;
  font-weight: 600;
}
input,
select,
button {
  font: inherit;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  color: inherit;
  background: white;
}
input,
select {
  width: 100%;
  min-width: 0;
}
button {
  cursor: pointer;
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.primary {
  background: #1d4ed8;
  color: white;
  border-color: #1d4ed8;
}
footer {
  justify-content: flex-end;
  flex-wrap: wrap;
}
.error {
  font-size: 0.875rem;
  color: #b91c1c;
}
small {
  color: #64748b;
}
[aria-invalid='true'] {
  border-color: #b91c1c;
}
:is(input, select, button):focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.lines,
.item-row {
  display: grid;
  gap: 1rem;
}
.item-row {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.line-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
h4 {
  margin: 0;
}
@media (max-width: 560px) {
  .line-fields {
    grid-template-columns: 1fr;
  }
}
.form-page {
  width: 100%;
  max-width: 1100px;
  max-height: none;
  overflow: visible;
  margin: 0;
  box-shadow: none;
  background: white;
  box-sizing: border-box;
}
.form-page h1 {
  margin: 0;
  font-size: 1.5rem;
}
</style>
