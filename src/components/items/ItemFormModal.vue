<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import { itemCategoryService } from '@/services/item-category.service'
import { unitService } from '@/services/unit.service'
import type { ItemCategory } from '@/types/item-category'
import type { Unit } from '@/types/unit'
import { itemService } from '@/services/item.service'
import {
  createItemSchema,
  updateItemSchema,
  itemStatusSchema,
  itemPriceSchema,
} from '@/schemas/item.schema'
import { toApiError } from '@/services/api/api-error'

const props = defineProps<{
  page?: boolean
  itemId?: number | null
  mode?: 'edit' | 'status' | 'price'
}>()
const emit = defineEmits<{ close: []; saved: [] }>()
const editing = computed(() => props.itemId != null)
const prefix = useId()
const dialog = ref<HTMLDialogElement | null>(null)
const form = reactive({
  name: '',
  code: '',
  description: '',
  item_category_id: '' as number | string,
  stock_unit_id: '' as number | string,
  min_stock: 0 as number | string,
  price: '' as number | string,
  is_active: undefined as boolean | undefined,
  item_unit_conversions: [] as {
    from_unit_id: number | string
    to_unit_id: number | string
    conversion_factor: number | string
  }[],
})
const categories = ref<ItemCategory[]>([])
const units = ref<Unit[]>([])
const statusOnly = computed(() => props.mode === 'status')
const priceOnly = computed(() => props.mode === 'price')
const detailsOnly = computed(() => statusOnly.value || priceOnly.value)
const missingCategory = computed(
  () =>
    form.item_category_id !== '' &&
    !categories.value.some((c) => c.id === Number(form.item_category_id)),
)
function missingUnit(id: number | string) {
  return id !== '' && !units.value.some((unit) => unit.id === Number(id))
}
function addConversion() {
  form.item_unit_conversions.push({ from_unit_id: '', to_unit_id: '', conversion_factor: '' })
}
function removeConversion(index: number) {
  form.item_unit_conversions.splice(index, 1)
  errors.value = {}
}
const loading = ref(true)
const saving = ref(false)
defineExpose({ saving })
const loadError = ref('')
const saveError = ref('')
const errors = ref<Record<string, string>>({})
let controller: AbortController | undefined
let disposed = false
let previousFocus: HTMLElement | null = null

async function load() {
  if (disposed || (loading.value && controller)) return
  controller = new AbortController()
  const active = controller
  loading.value = true
  loadError.value = ''
  try {
    const [categoryOptions, unitOptions, item] = await Promise.all([
      detailsOnly.value ? Promise.resolve([]) : itemCategoryService.listOptions(active.signal),
      detailsOnly.value ? Promise.resolve([]) : unitService.listOptions(active.signal),
      props.itemId != null ? itemService.get(props.itemId, active.signal) : Promise.resolve(null),
    ])
    if (disposed || active.signal.aborted) return
    categories.value = categoryOptions
    units.value = unitOptions
    if (item) {
      if (item.id !== props.itemId)
        throw new Error('The API returned a different item. Please retry.')
      form.name = item.name
      form.code = item.code
      form.description = item.description ?? ''
      form.item_category_id = item.item_category_id
      form.stock_unit_id = item.stock_unit_id
      form.min_stock = item.min_stock
      form.price = item.price ?? ''
      form.is_active = item.is_active
      form.item_unit_conversions = (item.item_unit_conversions ?? []).map((row) => ({
        from_unit_id: row.from_unit_id,
        to_unit_id: row.to_unit_id,
        conversion_factor: row.conversion_factor,
      }))
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
    if (statusOnly.value) {
      if (props.itemId == null) throw new Error('Select an item to update its status.')
      const payload = await itemStatusSchema.validate(
        { is_active: form.is_active },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await itemService.toggleActive(props.itemId, payload)
    } else if (priceOnly.value) {
      const payload = await itemPriceSchema.validate(
        { item_id: props.itemId, price: form.price },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await itemService.updatePrice(payload)
    } else {
      const input = {
        name: form.name,
        code: form.code,
        description: form.description,
        item_category_id: form.item_category_id,
        stock_unit_id: form.stock_unit_id,
        min_stock: form.min_stock,
        item_unit_conversions: form.item_unit_conversions.map((row) => ({ ...row })),
      }
      if (props.itemId != null) {
        const payload = await updateItemSchema.validate(
          { ...input, id: props.itemId },
          { abortEarly: false, stripUnknown: true },
        )
        if (disposed) return
        await itemService.update(payload)
      } else {
        const payload = await createItemSchema.validate(input, {
          abortEarly: false,
          stripUnknown: true,
        })
        if (disposed) return
        await itemService.create(payload)
      }
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
    class="item-modal"
    :aria-labelledby="`${prefix}-title`"
    @cancel.prevent="close"
  >
    <form novalidate :aria-busy="loading || saving" @submit.prevent="submit">
      <header>
        <component :is="page ? 'h1' : 'h2'" :id="`${prefix}-title`">
          {{
            statusOnly
              ? 'Update item status'
              : priceOnly
                ? 'Update item price'
                : editing
                  ? 'Edit item'
                  : 'Add item'
          }}
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
      <p v-if="loading" role="status">Loading item...</p>
      <div v-else-if="loadError" role="alert" class="error">
        <p>{{ loadError }}</p>
        <button type="button" @click="load">Try again</button>
      </div>
      <template v-else>
        <p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
        <p v-if="errors.id || errors.item_id" role="alert" class="error">
          {{ errors.id || errors.item_id }}
        </p>
        <fieldset :disabled="saving">
          <p v-if="detailsOnly">{{ form.name }} &middot; ID {{ itemId }}</p>
          <template v-if="statusOnly"
            ><div class="field">
              <label :for="`${prefix}-is_active`">Status</label>
              <select
                :id="`${prefix}-is_active`"
                name="is_active"
                v-model="form.is_active"
                :aria-invalid="!!errors.is_active"
                :aria-describedby="errors.is_active ? `${prefix}-is_active-error` : undefined"
                required
              >
                <option :value="undefined" disabled>Choose status</option>
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select>
              <span v-if="errors.is_active" :id="`${prefix}-is_active-error`" class="error">{{
                errors.is_active
              }}</span>
            </div></template
          >
          <template v-else-if="priceOnly"
            ><div class="field">
              <label :for="`${prefix}-price`">Price</label>
              <input
                :id="`${prefix}-price`"
                name="price"
                v-model="form.price"
                :aria-invalid="!!errors.price"
                :aria-describedby="errors.price ? `${prefix}-price-error` : undefined"
                type="number"
                min="0"
                step="any"
                required
              />
              <span v-if="errors.price" :id="`${prefix}-price-error`" class="error">{{
                errors.price
              }}</span>
            </div></template
          >
          <template v-else
            ><div class="field">
              <label :for="`${prefix}-name`">Name</label>
              <input
                :id="`${prefix}-name`"
                name="name"
                v-model="form.name"
                :aria-invalid="!!errors.name"
                :aria-describedby="errors.name ? `${prefix}-name-error` : undefined"
                required
              />
              <span v-if="errors.name" :id="`${prefix}-name-error`" class="error">{{
                errors.name
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-code`">Code</label>
              <input
                :id="`${prefix}-code`"
                name="code"
                v-model="form.code"
                :aria-invalid="!!errors.code"
                :aria-describedby="errors.code ? `${prefix}-code-error` : undefined"
                required
              />
              <span v-if="errors.code" :id="`${prefix}-code-error`" class="error">{{
                errors.code
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-item_category_id`">Item type</label>
              <select
                :id="`${prefix}-item_category_id`"
                name="item_category_id"
                v-model="form.item_category_id"
                :aria-invalid="!!errors.item_category_id"
                :aria-describedby="
                  errors.item_category_id ? `${prefix}-item_category_id-error` : undefined
                "
                required
              >
                <option value="" disabled>Choose an item type</option>
                <option v-if="missingCategory" :value="form.item_category_id">
                  Item type #{{ form.item_category_id }} (not in list)
                </option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
              <small v-if="!categories.length"
                >No item types found. Create an item category first.</small
              >
              <span
                v-if="errors.item_category_id"
                :id="`${prefix}-item_category_id-error`"
                class="error"
                >{{ errors.item_category_id }}</span
              >
            </div>
            <div class="field">
              <label :for="`${prefix}-stock_unit_id`">Stock unit</label>
              <select
                :id="`${prefix}-stock_unit_id`"
                name="stock_unit_id"
                v-model="form.stock_unit_id"
                :aria-invalid="!!errors.stock_unit_id"
                :aria-describedby="
                  errors.stock_unit_id ? `${prefix}-stock_unit_id-error` : undefined
                "
                required
              >
                <option value="" disabled>Choose a stock unit</option>
                <option v-if="missingUnit(form.stock_unit_id)" :value="form.stock_unit_id">
                  Unit #{{ form.stock_unit_id }} (not in list)
                </option>
                <option v-for="unit in units" :key="unit.id" :value="unit.id">
                  {{ unit.name }} ({{ unit.symbol }})
                </option>
              </select>
              <small v-if="!units.length">No units found. Create a unit first.</small>
              <span
                v-if="errors.stock_unit_id"
                :id="`${prefix}-stock_unit_id-error`"
                class="error"
                >{{ errors.stock_unit_id }}</span
              >
            </div>
            <div class="field">
              <label :for="`${prefix}-min_stock`">Minimum stock</label>
              <input
                :id="`${prefix}-min_stock`"
                name="min_stock"
                v-model="form.min_stock"
                :aria-invalid="!!errors.min_stock"
                :aria-describedby="errors.min_stock ? `${prefix}-min_stock-error` : undefined"
                type="number"
                min="0"
                step="any"
                required
              />
              <span v-if="errors.min_stock" :id="`${prefix}-min_stock-error`" class="error">{{
                errors.min_stock
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-description`">Description</label>
              <textarea
                :id="`${prefix}-description`"
                name="description"
                v-model="form.description"
                :aria-invalid="!!errors.description"
                :aria-describedby="errors.description ? `${prefix}-description-error` : undefined"
                rows="3"
              ></textarea>
              <span v-if="errors.description" :id="`${prefix}-description-error`" class="error">{{
                errors.description
              }}</span>
            </div>
            <section class="conversions" aria-label="Unit conversions">
              <h3>Unit conversions</h3>
              <p v-if="!form.item_unit_conversions.length">No conversions added.</p>
              <div
                v-for="(row, index) in form.item_unit_conversions"
                :key="index"
                class="conversion-row"
              >
                <h4>Conversion {{ index + 1 }}</h4>
                <div class="field">
                  <label :for="`${prefix}-conversion-${index}-from_unit_id`">From unit</label
                  ><select
                    :id="`${prefix}-conversion-${index}-from_unit_id`"
                    :name="`item_unit_conversions[${index}].from_unit_id`"
                    v-model="row.from_unit_id"
                    :aria-invalid="!!errors[`item_unit_conversions[${index}].from_unit_id`]"
                    :aria-describedby="
                      errors[`item_unit_conversions[${index}].from_unit_id`]
                        ? `${prefix}-conversion-${index}-from_unit_id-error`
                        : undefined
                    "
                    required
                  >
                    <option value="" disabled>Choose unit</option>
                    <option v-if="missingUnit(row.from_unit_id)" :value="row.from_unit_id">
                      Unit #{{ row.from_unit_id }} (not in list)
                    </option>
                    <option v-for="unit in units" :key="unit.id" :value="unit.id">
                      {{ unit.name }} ({{ unit.symbol }})
                    </option></select
                  ><span
                    v-if="errors[`item_unit_conversions[${index}].from_unit_id`]"
                    :id="`${prefix}-conversion-${index}-from_unit_id-error`"
                    class="error"
                    >{{ errors[`item_unit_conversions[${index}].from_unit_id`] }}</span
                  >
                </div>
                <div class="field">
                  <label :for="`${prefix}-conversion-${index}-to_unit_id`">To unit</label
                  ><select
                    :id="`${prefix}-conversion-${index}-to_unit_id`"
                    :name="`item_unit_conversions[${index}].to_unit_id`"
                    v-model="row.to_unit_id"
                    :aria-invalid="!!errors[`item_unit_conversions[${index}].to_unit_id`]"
                    :aria-describedby="
                      errors[`item_unit_conversions[${index}].to_unit_id`]
                        ? `${prefix}-conversion-${index}-to_unit_id-error`
                        : undefined
                    "
                    required
                  >
                    <option value="" disabled>Choose unit</option>
                    <option v-if="missingUnit(row.to_unit_id)" :value="row.to_unit_id">
                      Unit #{{ row.to_unit_id }} (not in list)
                    </option>
                    <option v-for="unit in units" :key="unit.id" :value="unit.id">
                      {{ unit.name }} ({{ unit.symbol }})
                    </option></select
                  ><span
                    v-if="errors[`item_unit_conversions[${index}].to_unit_id`]"
                    :id="`${prefix}-conversion-${index}-to_unit_id-error`"
                    class="error"
                    >{{ errors[`item_unit_conversions[${index}].to_unit_id`] }}</span
                  >
                </div>
                <div class="field">
                  <label :for="`${prefix}-conversion-${index}-conversion_factor`"
                    >Conversion factor</label
                  ><input
                    :id="`${prefix}-conversion-${index}-conversion_factor`"
                    :name="`item_unit_conversions[${index}].conversion_factor`"
                    v-model="row.conversion_factor"
                    :aria-invalid="!!errors[`item_unit_conversions[${index}].conversion_factor`]"
                    :aria-describedby="
                      errors[`item_unit_conversions[${index}].conversion_factor`]
                        ? `${prefix}-conversion-${index}-conversion_factor-error`
                        : undefined
                    "
                    type="number"
                    step="any"
                    min="0"
                    required
                  /><span
                    v-if="errors[`item_unit_conversions[${index}].conversion_factor`]"
                    :id="`${prefix}-conversion-${index}-conversion_factor-error`"
                    class="error"
                    >{{ errors[`item_unit_conversions[${index}].conversion_factor`] }}</span
                  >
                </div>
                <button
                  type="button"
                  :aria-label="`Remove conversion ${index + 1}`"
                  @click="removeConversion(index)"
                >
                  Remove
                </button>
              </div>
              <button type="button" @click="addConversion">Add conversion</button>
            </section></template
          >
        </fieldset></template
      >
      <footer>
        <button type="button" :disabled="saving" @click="close">Cancel</button>
        <button type="submit" class="primary" :disabled="saving || loading || !!loadError">
          {{
            saving
              ? 'Saving...'
              : statusOnly
                ? 'Update status'
                : priceOnly
                  ? 'Update price'
                  : editing
                    ? 'Save changes'
                    : 'Create item'
          }}
        </button>
      </footer>
    </form>
  </component>
</template>
<style scoped>
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  accent-color: #1d4ed8;
}
small {
  color: #64748b;
}
.item-modal {
  width: min(640px, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #1e293b;
  box-shadow: 0 24px 64px #0f172a33;
}
.item-modal::backdrop {
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
.conversions {
  display: grid;
  gap: 1rem;
}
.conversion-row {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
h4 {
  margin: 0;
}
textarea {
  resize: vertical;
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
