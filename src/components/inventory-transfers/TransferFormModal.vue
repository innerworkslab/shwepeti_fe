<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import AppIcon from '@/components/common/AppIcon.vue'
import { transferService } from '@/services/transfer.service'
import { warehouseService } from '@/services/warehouse.service'
import { itemService } from '@/services/item.service'
import { unitService } from '@/services/unit.service'
import { createTransferSchema, transferStatusSchema } from '@/schemas/transfer.schema'
import { toApiError } from '@/services/api/api-error'
import type { Transfer } from '@/types/transfer'
import type { Warehouse } from '@/types/warehouse'
import type { Item } from '@/types/item'
import type { Unit } from '@/types/unit'

const props = withDefaults(
  defineProps<{ transfer?: Pick<Transfer, 'id' | 'status'> | null; resourceLabel?: string }>(),
  { resourceLabel: 'transfer' },
)
const displayLabel = computed(
  () => props.resourceLabel.charAt(0).toUpperCase() + props.resourceLabel.slice(1),
)
const emit = defineEmits<{ close: []; saved: [] }>()
const statusOnly = computed(() => props.transfer != null)
const prefix = useId()
const dialog = ref<HTMLDialogElement | null>(null)
let nextRowKey = 0
function newRow() {
  return {
    key: nextRowKey++,
    item_id: '' as number | string,
    unit_id: '' as number | string,
    quantity: '' as number | string,
    expiry_date: '',
  }
}
const form = reactive({
  from_warehouse_id: '' as number | string,
  to_warehouse_id: '' as number | string,
  remark: '',
  transaction_date: '',
  status: props.transfer?.status === 'posted' ? props.transfer.status : '',
  items: [newRow()],
})
const warehouses = ref<Warehouse[]>([])
const items = ref<Item[]>([])
const units = ref<Unit[]>([])
const loading = ref(true)
const saving = ref(false)
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
      const [warehouseOptions, itemOptions, unitOptions] = await Promise.all([
        warehouseService.listOptions(active.signal),
        itemService.listOptions(active.signal),
        unitService.listOptions(active.signal),
      ])
      if (disposed || active.signal.aborted) return
      warehouses.value = warehouseOptions
      items.value = itemOptions
      units.value = unitOptions
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
  dialog.value?.showModal()
  void load()
})
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
  dialog.value?.close()
  previousFocus?.focus()
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
    if (props.transfer) {
      const payload = await transferStatusSchema.validate(
        { status: form.status },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await transferService.updateStatus(props.transfer.id, payload)
    } else {
      const payload = await createTransferSchema.validate(
        {
          from_warehouse_id: form.from_warehouse_id,
          to_warehouse_id: form.to_warehouse_id,
          remark: form.remark,
          transaction_date: form.transaction_date,
          items: form.items.map(({ item_id, unit_id, quantity, expiry_date }) => ({
            item_id,
            unit_id,
            quantity,
            expiry_date,
          })),
        },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await transferService.create(payload)
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
  <dialog
    ref="dialog"
    class="transfer-modal"
    :aria-labelledby="`${prefix}-title`"
    @cancel.prevent="close"
  >
    <form novalidate :aria-busy="loading || saving" @submit.prevent="submit">
      <header>
        <h2 :id="`${prefix}-title`">
          {{ statusOnly ? `Update ${resourceLabel} status` : `Add ${resourceLabel}` }}
        </h2>
        <button type="button" aria-label="Close dialog" :disabled="saving" @click="close">
          <AppIcon name="close" />
        </button>
      </header>
      <p v-if="loading" role="status">Loading {{ resourceLabel }} options...</p>
      <div v-else-if="loadError" role="alert" class="error">
        <p>{{ loadError }}</p>
        <button type="button" @click="load">Try again</button>
      </div>
      <template v-else
        ><p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
        <fieldset :disabled="saving">
          <template v-if="statusOnly"
            ><p>
              {{ displayLabel }} #{{ transfer?.id }} &middot; Current status:
              {{ transfer?.status ?? 'Unknown' }}
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
                <option value="posted">Posted</option></select
              ><span v-if="errors.status" :id="`${prefix}-status-error`" class="error">{{
                errors.status
              }}</span>
            </div></template
          >
          <template v-else>
            <div class="field">
              <label :for="`${prefix}-from_warehouse_id`">From warehouse</label
              ><select
                :id="`${prefix}-from_warehouse_id`"
                name="from_warehouse_id"
                v-model="form.from_warehouse_id"
                :aria-invalid="!!errors.from_warehouse_id"
                :aria-describedby="
                  errors.from_warehouse_id ? `${prefix}-from_warehouse_id-error` : undefined
                "
                required
              >
                <option value="" disabled>Choose a source warehouse</option>
                <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                  {{ warehouse.name }} ({{ warehouse.code }})
                </option></select
              ><small v-if="!warehouses.length"
                >No warehouses found. Create a warehouse first.</small
              ><span
                v-if="errors.from_warehouse_id"
                :id="`${prefix}-from_warehouse_id-error`"
                class="error"
                >{{ errors.from_warehouse_id }}</span
              >
            </div>
            <div class="field">
              <label :for="`${prefix}-to_warehouse_id`">To warehouse</label
              ><select
                :id="`${prefix}-to_warehouse_id`"
                name="to_warehouse_id"
                v-model="form.to_warehouse_id"
                :aria-invalid="!!errors.to_warehouse_id"
                :aria-describedby="
                  errors.to_warehouse_id ? `${prefix}-to_warehouse_id-error` : undefined
                "
                required
              >
                <option value="" disabled>Choose a destination warehouse</option>
                <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                  {{ warehouse.name }} ({{ warehouse.code }})
                </option></select
              ><small v-if="!warehouses.length"
                >No warehouses found. Create a warehouse first.</small
              ><span
                v-if="errors.to_warehouse_id"
                :id="`${prefix}-to_warehouse_id-error`"
                class="error"
                >{{ errors.to_warehouse_id }}</span
              >
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
            <div class="field">
              <label :for="`${prefix}-remark`">Remark</label>
              <textarea
                :id="`${prefix}-remark`"
                name="remark"
                v-model="form.remark"
                rows="3"
                :aria-invalid="!!errors.remark"
                :aria-describedby="errors.remark ? `${prefix}-remark-error` : undefined"
              ></textarea>
              <span v-if="errors.remark" :id="`${prefix}-remark-error`" class="error">{{
                errors.remark
              }}</span>
            </div>
            <section class="lines" aria-label="Transfer items">
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
                    <label :for="`${prefix}-item-${row.key}-expiry_date`">Expiry date</label
                    ><input
                      :id="`${prefix}-item-${row.key}-expiry_date`"
                      :name="`items[${index}].expiry_date`"
                      v-model="row.expiry_date"
                      :aria-invalid="!!errors[`items[${index}].expiry_date`]"
                      :aria-describedby="
                        errors[`items[${index}].expiry_date`]
                          ? `${prefix}-item-${row.key}-expiry_date-error`
                          : undefined
                      "
                      type="date"
                      required
                    /><span
                      v-if="errors[`items[${index}].expiry_date`]"
                      :id="`${prefix}-item-${row.key}-expiry_date-error`"
                      class="error"
                      >{{ errors[`items[${index}].expiry_date`] }}</span
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
          {{ saving ? 'Saving...' : statusOnly ? 'Update status' : `Create ${resourceLabel}` }}
        </button>
      </footer>
    </form>
  </dialog>
</template>
<style scoped>
.transfer-modal {
  width: min(720px, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #1e293b;
  box-shadow: 0 24px 64px #0f172a33;
}
.transfer-modal::backdrop {
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
textarea,
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
textarea,
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
:is(input, select, textarea, button):focus-visible {
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
textarea {
  resize: vertical;
}
</style>
